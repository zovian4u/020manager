const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { loadAnnouncements, saveAnnouncement } = require('./database');

// Active cron / timeout jobs held in memory
const activeJobs = new Map();

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

  // Direct URL
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
      return str; // Direct image URL
    }
  }

  // Pure numbers -> Discord Message ID in target channel
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
 * @param {Object} client Discord Client
 * @param {Object} item Announcement item
 */
function scheduleItem(client, item) {
  cancelScheduledJob(item.id);

  const startTimeMs = item.executeAt ? new Date(item.executeAt).getTime() : Date.now();
  const now = Date.now();
  const delay = startTimeMs - now;

  const hasInterval = item.intervalMinutes && item.intervalMinutes > 0;
  const intervalMs = hasInterval ? item.intervalMinutes * 60 * 1000 : 0;

  if (delay <= 0) {
    // Start time is now or passed
    if (item.isNewCreation) {
      dispatchAnnouncement(client, item);
      item.isNewCreation = false;
      saveAnnouncement(item);
    }

    if (hasInterval) {
      const timer = setInterval(async () => {
        await dispatchAnnouncement(client, item);
        item.lastExecutedAt = new Date().toISOString();
        await saveAnnouncement(item);
      }, intervalMs);

      activeJobs.set(item.id, { timer, type: 'interval' });
    } else {
      item.active = false;
      saveAnnouncement(item);
    }

  } else {
    // Start time is in the future
    const timer = setTimeout(async () => {
      await dispatchAnnouncement(client, item);
      item.lastExecutedAt = new Date().toISOString();
      item.isNewCreation = false;

      if (hasInterval) {
        // Start recurring interval after first execution
        const intervalTimer = setInterval(async () => {
          await dispatchAnnouncement(client, item);
          item.lastExecutedAt = new Date().toISOString();
          await saveAnnouncement(item);
        }, intervalMs);

        activeJobs.set(item.id, { timer: intervalTimer, type: 'interval' });
      } else {
        item.active = false;
        activeJobs.delete(item.id);
      }
      await saveAnnouncement(item);

    }, delay);

    activeJobs.set(item.id, { timer, type: 'once' });
  }
}

/**
 * Cancel a running schedule job.
 */
function cancelScheduledJob(id) {
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
}

/**
 * Dispatch rich embed announcement to target Discord channel (clean format: title + body + image + creator footer).
 */
async function dispatchAnnouncement(client, item) {
  try {
    const channel = await client.channels.fetch(item.targetChannelId);
    if (!channel) {
      console.error(`Target channel ${item.targetChannelId} not found for announcement ${item.id}`);
      return;
    }

    // Discord Blurple color theme
    const color = 0x5865F2;

    const embed = new EmbedBuilder()
      .setTitle(`⚔️ ${item.title || 'Alliance Announcement'}`)
      .setDescription(item.content)
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: `Creator: ${item.createdBy || 'Alliance Leader'}` });

    // Image URL / Message Link / Message ID resolution
    const finalImageUrl = await resolveImageUrl(client, item.imageUrl, item.targetChannelId);
    if (finalImageUrl) {
      embed.setImage(finalImageUrl);
    }

    // Role Ping string
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
    saveAnnouncement(item);

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
