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
 * Schedule an announcement with optional future Start Time and optional Repeat Interval.
 */
function scheduleItem(client, item) {
  cancelScheduledJob(item.id);
  deletedIds.delete(String(item.id)); // Re-activate if re-created

  const startTimeMs = item.executeAt ? new Date(item.executeAt).getTime() : Date.now();
  const now = Date.now();
  const delay = startTimeMs - now;

  const hasInterval = item.intervalMinutes && item.intervalMinutes > 0;
  const intervalMs = hasInterval ? item.intervalMinutes * 60 * 1000 : 0;
  const needsImmediateDispatch = item.isNewCreation || (!item.lastExecutedAt && delay <= 0);

  if (delay <= 0) {
    if (needsImmediateDispatch) {
      dispatchAnnouncement(client, item);
      item.isNewCreation = false;
      item.lastExecutedAt = new Date().toISOString();
      if (!deletedIds.has(String(item.id))) saveAnnouncement(item);
    }

    if (hasInterval) {
      const timer = setInterval(async () => {
        if (deletedIds.has(String(item.id))) {
          clearInterval(timer);
          activeJobs.delete(item.id);
          return;
        }
        await dispatchAnnouncement(client, item);
        item.lastExecutedAt = new Date().toISOString();
        if (!deletedIds.has(String(item.id))) await saveAnnouncement(item);
      }, intervalMs);

      activeJobs.set(item.id, { timer, type: 'interval' });
    } else {
      item.active = false;
      if (!deletedIds.has(String(item.id))) saveAnnouncement(item);
    }

  } else {
    const timer = setTimeout(async () => {
      if (deletedIds.has(String(item.id))) {
        activeJobs.delete(item.id);
        return;
      }

      await dispatchAnnouncement(client, item);
      item.lastExecutedAt = new Date().toISOString();
      item.isNewCreation = false;

      if (hasInterval) {
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
        item.active = false;
        activeJobs.delete(item.id);
      }

      if (!deletedIds.has(String(item.id))) await saveAnnouncement(item);

    }, delay);

    activeJobs.set(item.id, { timer, type: 'once' });
  }
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
