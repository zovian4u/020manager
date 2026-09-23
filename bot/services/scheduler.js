const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { loadAnnouncements, saveAnnouncement, deleteAnnouncement } = require('./database');

// Active cron / timeout jobs held in memory
const activeJobs = new Map();
// Track deleted IDs to prevent ghost re-saves
const deletedIds = new Set();

/**
 * Initialize all scheduled announcements on bot start.
 */
async function initScheduler(client) {
  console.log('⏰ Initializing Alliance Reminder Scheduler...');
  const announcements = await loadAnnouncements();

  for (const item of announcements) {
    if (item.active !== false) {
      const startMs    = item.executeAt ? new Date(item.executeAt).getTime() : Date.now();
      const hasInterval = item.intervalMinutes && item.intervalMinutes > 0;
      const isOverdue   = startMs <= Date.now();

      if (isOverdue) {
        if (hasInterval) {
          // ── Recurring: advance to next future cycle, don't fire immediately ──
          const intervalMs   = item.intervalMinutes * 60 * 1000;
          const elapsed      = Date.now() - startMs;
          const cyclesPassed = Math.ceil(elapsed / intervalMs);
          item.executeAt     = new Date(startMs + cyclesPassed * intervalMs).toISOString();
          item.isNewCreation = false;
          await saveAnnouncement(item);
          console.log(`⏩ [Scheduler] Advanced "${item.title}" [${item.id}] → next fire: ${item.executeAt}`);
        } else {
          // ── One-time: already past due — skip it, do NOT re-fire on restart ──
          // Prevents double-pinging @everyone if the bot restarted after the
          // announcement fired but before active:false was saved to Supabase.
          item.active = false;
          await saveAnnouncement(item);
          console.log(`⏭️  [Scheduler] Skipped past-due one-time item "${item.title}" [${item.id}]`);
          continue;
        }
      }

      scheduleItem(client, item);
    }
  }
  console.log(`✅ Loaded ${announcements.length} scheduled reminders into scheduler.`);
}

/**
 * Resolve an image URL from direct link, Discord Message Link, or Discord Message ID.
 */
async function resolveImageUrl(client, input, targetChannelId) {
  if (!input || !input.trim()) return null;
  const str = input.trim();

  if (str.startsWith('http://') || str.startsWith('https://')) {
    const match = str.match(/channels\/\d+\/(\d+)\/(\d+)/);
    if (match) {
      const channelId = match[1];
      const messageId = match[2];
      try {
        const chan = await client.channels.fetch(channelId);
        if (chan) {
          const msg = await chan.messages.fetch(messageId);
          const att = msg.attachments.first();
          if (att && att.url) return att.url;
        }
      } catch (e) {
        console.warn('Failed to fetch image from message link:', e.message);
      }
    } else {
      return str;
    }
  }

  if (/^\d+$/.test(str)) {
    try {
      const chan = await client.channels.fetch(targetChannelId);
      if (chan) {
        const msg = await chan.messages.fetch(str);
        const att = msg.attachments.first();
        if (att && att.url) return att.url;
      }
    } catch (e) {
      console.warn('Failed to fetch image from message ID:', e.message);
    }
  }

  return null;
}

/**
 * Schedule an announcement. Always async via setTimeout — never fires synchronously.
 * "now" items use delay=0 (next event loop tick). Future items use their actual delay.
 */
function scheduleItem(client, item) {
  cancelScheduledJob(item.id);
  deletedIds.delete(String(item.id)); // re-activate if re-created

  const startTimeMs = item.executeAt ? new Date(item.executeAt).getTime() : Date.now();
  const delay       = Math.max(0, startTimeMs - Date.now()); // never negative
  const hasInterval = item.intervalMinutes && item.intervalMinutes > 0;
  const intervalMs  = hasInterval ? item.intervalMinutes * 60 * 1000 : 0;

  // Always async — prevents @everyone firing synchronously during /create
  const timer = setTimeout(async () => {
    if (deletedIds.has(String(item.id))) {
      activeJobs.delete(item.id);
      return;
    }

    // First dispatch
    await dispatchAnnouncement(client, item);
    item.lastExecutedAt = new Date().toISOString();

    if (hasInterval) {
      // Set up the repeat interval after first dispatch
      const intervalTimer = setInterval(async () => {
        if (deletedIds.has(String(item.id))) {
          clearInterval(intervalTimer);
          activeJobs.delete(item.id);
          return;
        }
        await dispatchAnnouncement(client, item);
        item.lastExecutedAt = new Date().toISOString();
        if (!deletedIds.has(String(item.id))) await saveAnnouncement(item);
      }, intervalMs);

      activeJobs.set(item.id, { timer: intervalTimer, type: 'interval' });
    } else {
      // One-time: mark as done
      item.active = false;
      activeJobs.delete(item.id);
    }

    if (!deletedIds.has(String(item.id))) await saveAnnouncement(item);

  }, delay);

  activeJobs.set(item.id, { timer, type: 'once' });
}

/**
 * Cancel a running schedule job and mark as deleted to prevent ghost re-saves.
 */
function cancelScheduledJob(id) {
  const strId = String(id);
  deletedIds.add(strId); // Mark as deleted — prevents any in-memory re-save

  if (activeJobs.has(id)) {
    const job = activeJobs.get(id);
    if (job.type === 'cron' && job.task) {
      job.task.stop();
    } else if (job.timer) {
      clearTimeout(job.timer);
      clearInterval(job.timer);
    }
    activeJobs.delete(id);
  }
  console.log(`🛑 Cancelled in-memory job for ID: ${id}`);
}

/**
 * Dispatch rich embed announcement to target Discord channel.
 */
async function dispatchAnnouncement(client, item) {
  // Guard: don't dispatch for deleted items
  if (deletedIds.has(String(item.id))) {
    console.log(`⚠️ Skipped dispatch for deleted item: ${item.id}`);
    return;
  }

  try {
    const channel = await client.channels.fetch(item.targetChannelId);
    if (!channel) {
      console.error(`Target channel ${item.targetChannelId} not found for announcement ${item.id}`);
      return;
    }

    const color = 0x5865F2;

    const embed = new EmbedBuilder()
      .setTitle(`⚔️ ${item.title || 'Alliance Announcement'}`)
      .setDescription(item.content)
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: `Creator: ${item.createdBy || 'Alliance Leader'}` });

    const finalImageUrl = await resolveImageUrl(client, item.imageUrl, item.targetChannelId);
    if (finalImageUrl) {
      embed.setImage(finalImageUrl);
    }

    let pingText = '';
    if (item.rolePing && item.rolePing !== 'none') {
      if (item.rolePing === 'everyone') pingText = '@everyone ';
      else if (item.rolePing === 'here') pingText = '@here ';
      else pingText = `<@&${item.rolePing}> `;
    }

    const message = await channel.send({
      content: pingText ? pingText.trim() : null,
      embeds: [embed]
    });

    item.lastMessageId = message.id;
    if (!deletedIds.has(String(item.id))) saveAnnouncement(item);

  } catch (err) {
    console.error(`Error sending announcement ${item.id}:`, err);
  }
}

module.exports = {
  initScheduler,
  scheduleItem,
  cancelScheduledJob,
  dispatchAnnouncement,
};
