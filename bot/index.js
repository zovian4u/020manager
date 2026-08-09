const { 
  Client, 
  GatewayIntentBits, 
  Events, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ChannelType
} = require('discord.js');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { isAllianceLeader } = require('./commands/announce');
const { initScheduler, scheduleItem, cancelScheduledJob } = require('./services/scheduler');
const { saveAnnouncement, loadAnnouncements, deleteAnnouncement, matchId } = require('./services/database');

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('❌ Error: DISCORD_TOKEN is missing in your .env.local file!');
  process.exit(1);
}

// Lightweight HTTP server for Render Health Checks & UptimeRobot pings
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('🤖 Wolfie Alliance Discord Bot is Online 24/7!');
}).listen(PORT, () => {
  console.log(`🌐 Keep-Alive HTTP Server listening on port ${PORT}`);
});

// Initialize Client with Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Store temporary session state for modal creation/editing
const sessionState = new Map();

/**
 * Generate sequential clean IDs starting from "001", "002", "003"... per guild
 */
function generateNextId(list) {
  let maxId = 0;
  if (Array.isArray(list)) {
    list.forEach(item => {
      const num = parseInt(String(item.id).replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    });
  }
  return String(maxId + 1).padStart(3, '0');
}

/**
 * Parse Start Date & Time from separate Time (HH:MM 24h) and Date (DDMMYYYY) fields:
 */
function parseDateTime(timeRaw, dateRaw) {
  const tStr = (timeRaw || 'now').trim().toLowerCase();
  const dStr = (dateRaw || 'today').trim().toLowerCase();

  if (tStr === 'now' || tStr === '0') {
    return new Date().toISOString();
  }

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  let day = now.getDate();

  if (dStr === 'tomorrow') {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    year = tmr.getFullYear();
    month = tmr.getMonth();
    day = tmr.getDate();
  } else if (dStr !== 'today' && dStr !== 'now' && dStr !== '') {
    const dMatch = dStr.match(/^(\d{2})[-/]?(\d{2})[-/]?(\d{4})$/);
    if (dMatch) {
      day = parseInt(dMatch[1], 10);
      month = parseInt(dMatch[2], 10) - 1;
      year = parseInt(dMatch[3], 10);
    }
  }

  let hours = now.getHours();
  let minutes = now.getMinutes();

  const tMatch = tStr.match(/^(\d{1,2}):(\d{2})$/);
  if (tMatch) {
    hours = parseInt(tMatch[1], 10);
    minutes = parseInt(tMatch[2], 10);
  }

  const target = new Date(year, month, day, hours, minutes, 0, 0);

  if ((dStr === 'today' || dStr === '') && target.getTime() <= Date.now()) {
    target.setDate(target.getDate() + 1);
  }

  return target.toISOString();
}

/**
 * Parse Custom Time Interval in minutes, hours, or days
 */
function parseInterval(inputRaw) {
  const str = (inputRaw || 'none').trim().toLowerCase();

  if (str === 'none' || str === '0' || str === 'off' || str === 'no') {
    return null;
  }

  // Reject 8-digit date strings accidentally typed into interval field (e.g. 09082026)
  if (/^\d{8}$/.test(str)) {
    return null;
  }

  if (str.includes('h') || str.includes('hour')) {
    const numMatch = str.match(/^(\d+(?:\.\d+)?)/);
    if (numMatch) {
      const hours = parseFloat(numMatch[1]);
      return Math.round(hours * 60);
    }
  }

  if (str.includes('d') || str.includes('day')) {
    const numMatch = str.match(/^(\d+(?:\.\d+)?)/);
    if (numMatch) {
      const days = parseFloat(numMatch[1]);
      return Math.round(days * 1440);
    }
  }

  const minMatch = str.match(/^(\d+(?:\.\d+)?)/);
  if (minMatch) {
    const mins = parseFloat(minMatch[1]);
    if (mins > 525600) return null;
    return Math.round(mins);
  }

  return null;
}

/**
 * Parse Interval and Image link from Field 5
 */
function parseIntervalAndImage(inputRaw, bodyContent = '') {
  let imageUrl = null;

  if (!inputRaw || !inputRaw.trim()) {
    return { intervalMinutes: null, imageUrl: null };
  }

  const str = inputRaw.trim();

  // Extract Discord Message Link or direct image URL if present in Field 5
  const msgLinkMatch = str.match(/https:\/\/discord\.com\/channels\/\d+\/(\d+)\/(\d+)/);
  const directUrlMatch = str.match(/(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp))/i);

  if (msgLinkMatch) {
    imageUrl = msgLinkMatch[0];
  } else if (directUrlMatch) {
    imageUrl = directUrlMatch[0];
  }

  // Fallback: check body content if Field 5 doesn't contain an image link
  if (!imageUrl) {
    const bodyMsgLink = bodyContent.match(/https:\/\/discord\.com\/channels\/\d+\/(\d+)\/(\d+)/);
    const bodyDirectUrl = bodyContent.match(/(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp))/i);
    if (bodyMsgLink) imageUrl = bodyMsgLink[0];
    else if (bodyDirectUrl) imageUrl = bodyDirectUrl[0];
  }

  // Remove the image URL from interval string to parse interval
  const intervalStr = str.replace(imageUrl || '', '').trim();
  const intervalMinutes = parseInterval(intervalStr);

  return { intervalMinutes, imageUrl };
}

client.once(Events.ClientReady, async (c) => {
  console.log('----------------------------------------------------');
  console.log(`🤖 Alliance Discord Bot is ONLINE as ${c.user.tag}`);
  console.log(`🛡️ Server Count: ${c.guilds.cache.size}`);
  console.log('----------------------------------------------------');

  await initScheduler(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Top-Level Slash Command Handler (/create, /edit, /list, /delete, /preset)
    if (interaction.isChatInputCommand()) {
      const commandName = interaction.commandName;
      const member = interaction.member;

      // Permission Guard for Leaders
      if (!isAllianceLeader(member)) {
        return interaction.reply({
          content: '❌ **Permission Denied**: Only **R4 / R5 Alliance Leaders** can execute bot commands.',
          ephemeral: true
        });
      }

      if (commandName === 'create') {
        const channels = interaction.guild.channels.cache
          .filter(c => c.type === ChannelType.GuildText)
          .first(25);

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_announce_channel')
          .setPlaceholder('Select Target Channel for Announcement...')
          .addOptions(
            channels.map(c => ({
              label: `#${c.name}`,
              value: c.id,
              description: `Post to #${c.name}`
            }))
          );

        const row = new ActionRowBuilder().addComponents(selectMenu);
        return interaction.reply({
          content: '📢 **Create Announcement**: Select target channel below:',
          components: [row],
          ephemeral: true
        });

      } else if (commandName === 'edit') {
        const id = interaction.options.getString('id');
        const list = await loadAnnouncements(interaction.guildId);
        const item = list.find(a => matchId(a.id, id));

        if (!item) {
          return interaction.reply({
            content: `❌ Announcement with ID \`${id}\` not found in this server. Use \`/list\` to see active IDs.`,
            ephemeral: true
          });
        }

        sessionState.set(interaction.user.id, { editingId: item.id, targetChannelId: item.targetChannelId });

        const modal = new ModalBuilder()
          .setCustomId('modal_announce_edit')
          .setTitle(`Edit Announcement [ID: ${item.id}]`);

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;

        const titleInput = new TextInputBuilder()
          .setCustomId('announce_title')
          .setLabel('Title')
          .setValue(item.title || '')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const contentInput = new TextInputBuilder()
          .setCustomId('announce_content')
          .setLabel('Message Body')
          .setValue(item.content || '')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const startTimeInput = new TextInputBuilder()
          .setCustomId('announce_start_time')
          .setLabel(`Start Time HH:MM (Bot now: ${timeStr})`)
          .setPlaceholder('e.g. "18:00" or "now"')
          .setValue('now')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const startDateInput = new TextInputBuilder()
          .setCustomId('announce_start_date')
          .setLabel(`Start Date DDMMYYYY (today: ${dateStr})`)
          .setPlaceholder(`e.g. "${dateStr}", "today", or "tomorrow"`)
          .setValue('today')
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        let existingIntervalStr = 'none';
        if (item.intervalMinutes) {
          if (item.intervalMinutes >= 1440 && item.intervalMinutes % 1440 === 0) {
            existingIntervalStr = `${item.intervalMinutes / 1440} days`;
          } else if (item.intervalMinutes >= 60 && item.intervalMinutes % 60 === 0) {
            existingIntervalStr = `${item.intervalMinutes / 60} hours`;
          } else {
            existingIntervalStr = `${item.intervalMinutes}m`;
          }
        }
        if (item.imageUrl) {
          existingIntervalStr = `${existingIntervalStr} ${item.imageUrl}`;
        }

        const intervalInput = new TextInputBuilder()
          .setCustomId('announce_interval')
          .setLabel('Interval (36h) & Image Link (Copy Msg Link)')
          .setPlaceholder('e.g. "none", "36 hours", or paste Discord Image Link')
          .setValue(existingIntervalStr)
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(titleInput),
          new ActionRowBuilder().addComponents(contentInput),
          new ActionRowBuilder().addComponents(startTimeInput),
          new ActionRowBuilder().addComponents(startDateInput),
          new ActionRowBuilder().addComponents(intervalInput)
        );

        return interaction.showModal(modal);

      } else if (commandName === 'list') {
        const list = await loadAnnouncements(interaction.guildId);
        if (list.length === 0) {
          return interaction.reply({
            content: 'ℹ️ No active scheduled announcements found for this server.',
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('📜 Alliance Active Announcements & Reminders')
          .setColor(0x5865F2)
          .setTimestamp();

        list.forEach((item, i) => {
          let typeStr = 'One-time';
          if (item.intervalMinutes) {
            typeStr = item.intervalMinutes >= 1440 ? `Every ${item.intervalMinutes / 1440} day(s)` : `Every ${item.intervalMinutes}m`;
          }
          const channelMention = `<#${item.targetChannelId}>`;
          
          embed.addFields({
            name: `${i + 1}. [ID: ${item.id}] ${item.title}`,
            value: `📍 **Channel**: ${channelMention}\n⏱️ **Schedule**: ${typeStr}\n👤 **Creator**: ${item.createdBy || 'Alliance Leader'}`,
            inline: false
          });
        });

        return interaction.reply({ embeds: [embed], ephemeral: true });

      } else if (commandName === 'delete') {
        const id = interaction.options.getString('id');
        const { success } = await deleteAnnouncement(id, interaction.guildId);
        cancelScheduledJob(id);

        if (success) {
          return interaction.reply({
            content: `✅ Successfully deleted announcement \`${id}\`.`,
            ephemeral: true
          });
        } else {
          return interaction.reply({
            content: `❌ Announcement with ID \`${id}\` not found in this server. Use \`/list\` to see active IDs.`,
            ephemeral: true
          });
        }

      } else if (commandName === 'preset') {
        const presetsMenu = new StringSelectMenuBuilder()
          .setCustomId('select_announce_preset')
          .setPlaceholder('Choose Alliance Event Preset...')
          .addOptions([
            {
              label: '🌵 Desert Storm (30m Alert)',
              value: 'preset_desert_storm',
              description: 'Recurring match readiness alerts'
            },
            {
              label: '⛈️ Canyon Storm (15m Alert)',
              value: 'preset_canyon_storm',
              description: 'Rally and deployment reminder'
            },
            {
              label: '💡 Tech Donation & Daily Reset',
              value: 'preset_tech_reset',
              description: 'Daily tech donations & arms race alert'
            }
          ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        return interaction.reply({
          content: '⚡ **Select Alliance Preset to quick-deploy:**',
          components: [row],
          ephemeral: true
        });
      }
    }

    // Handle String Select Menu (Channel Selection & Presets)
    else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_announce_channel') {
        const targetChannelId = interaction.values[0];
        sessionState.set(interaction.user.id, { targetChannelId });

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;

        const modal = new ModalBuilder()
          .setCustomId('modal_announce_submit')
          .setTitle('Create Alliance Announcement');

        const titleInput = new TextInputBuilder()
          .setCustomId('announce_title')
          .setLabel('Title')
          .setPlaceholder('e.g., Marshall Event / Desert Storm')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const contentInput = new TextInputBuilder()
          .setCustomId('announce_content')
          .setLabel('Message Body')
          .setPlaceholder('Enter full strategy notes, timing instructions, or links...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const startTimeInput = new TextInputBuilder()
          .setCustomId('announce_start_time')
          .setLabel(`Start Time HH:MM (Bot now: ${timeStr})`)
          .setPlaceholder('e.g. "18:00" or "now"')
          .setStyle(TextInputStyle.Short)
          .setValue('now')
          .setRequired(true);

        const startDateInput = new TextInputBuilder()
          .setCustomId('announce_start_date')
          .setLabel(`Start Date DDMMYYYY (today: ${dateStr})`)
          .setPlaceholder(`e.g. "${dateStr}", "today", or "tomorrow"`)
          .setStyle(TextInputStyle.Short)
          .setValue('today')
          .setRequired(false);

        const intervalInput = new TextInputBuilder()
          .setCustomId('announce_interval')
          .setLabel('Interval (36h) & Image Link (Copy Msg Link)')
          .setPlaceholder('e.g. "none", "36 hours", or paste Discord Image Link')
          .setStyle(TextInputStyle.Short)
          .setValue('none')
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(titleInput),
          new ActionRowBuilder().addComponents(contentInput),
          new ActionRowBuilder().addComponents(startTimeInput),
          new ActionRowBuilder().addComponents(startDateInput),
          new ActionRowBuilder().addComponents(intervalInput)
        );

        await interaction.showModal(modal);

      } else if (interaction.customId === 'select_announce_preset') {
        const presetKey = interaction.values[0];
        
        let title = 'Alliance Alert';
        let content = 'Alliance notice';

        if (presetKey === 'preset_desert_storm') {
          title = '🌵 Desert Storm Match Reminder';
          content = 'Desert Storm battle is approaching! All registered fighters prepare your squads!';
        } else if (presetKey === 'preset_canyon_storm') {
          title = '⛈️ Canyon Storm Battle Readiness';
          content = 'Canyon Storm is starting soon! Ensure rallies are assigned and squad leaders are in voice chat.';
        } else if (presetKey === 'preset_tech_reset') {
          title = '💡 Tech Donation & Daily Arms Race';
          content = 'Daily reset complete! Donate maximum diamonds/rss to Alliance Tech and claim arms race rewards.';
        }

        const channels = interaction.guild.channels.cache
          .filter(c => c.type === 0)
          .first(25);

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`select_preset_channel_${presetKey}`)
          .setPlaceholder(`Select Channel for Preset: ${title}`)
          .addOptions(
            channels.map(c => ({
              label: `#${c.name}`,
              value: c.id
            }))
          );

        const row = new ActionRowBuilder().addComponents(selectMenu);
        await interaction.reply({
          content: `🎯 **Preset Selected**: ${title}\nSelect target channel below to activate:`,
          components: [row],
          ephemeral: true
        });

      } else if (interaction.customId.startsWith('select_preset_channel_')) {
        const targetChannelId = interaction.values[0];
        const presetKey = interaction.customId.replace('select_preset_channel_', '');

        let title = 'Alliance Preset Event';
        let content = 'Alliance Event Notification';
        let intervalMinutes = 30;

        if (presetKey === 'preset_desert_storm') {
          title = '🌵 Desert Storm Match Reminder';
          content = 'Desert Storm battle is approaching! All registered fighters prepare your squads!';
          intervalMinutes = 30;
        } else if (presetKey === 'preset_canyon_storm') {
          title = '⛈️ Canyon Storm Battle Readiness';
          content = 'Canyon Storm is starting soon! Ensure rallies are assigned and squad leaders are in voice chat.';
          intervalMinutes = 15;
        } else if (presetKey === 'preset_tech_reset') {
          title = '💡 Tech Donation & Daily Arms Race';
          content = 'Daily reset complete! Donate maximum diamonds/rss to Alliance Tech and claim arms race rewards.';
          intervalMinutes = 1440;
        }

        const existingList = await loadAnnouncements(interaction.guildId);
        const nextId = generateNextId(existingList);

        const newAnnouncement = {
          id: nextId,
          guildId: interaction.guildId,
          title,
          content,
          targetChannelId,
          type: 'interval',
          executeAt: new Date().toISOString(),
          intervalMinutes,
          rolePing: 'everyone',
          createdBy: interaction.user.tag,
          createdAt: new Date().toISOString(),
          active: true,
          isNewCreation: true
        };

        await saveAnnouncement(newAnnouncement);
        scheduleItem(client, newAnnouncement);

        await interaction.reply({
          content: `✅ Preset **${title}** [ID: \`${nextId}\`] successfully activated in <#${targetChannelId}>!`,
          ephemeral: true
        });
      }
    }

    // Handle Modal Submissions (New Creation & Edit)
    else if (interaction.isModalSubmit()) {
      if (interaction.customId === 'modal_announce_submit' || interaction.customId === 'modal_announce_edit') {
        const isEdit = interaction.customId === 'modal_announce_edit';
        const session = sessionState.get(interaction.user.id);

        const title = interaction.fields.getTextInputValue('announce_title').trim();
        const content = interaction.fields.getTextInputValue('announce_content').trim();
        const startTimeRaw = interaction.fields.getTextInputValue('announce_start_time');
        const startDateRaw = interaction.fields.getTextInputValue('announce_start_date');
        const intervalRaw = interaction.fields.getTextInputValue('announce_interval');

        const executeAt = parseDateTime(startTimeRaw, startDateRaw);
        const { intervalMinutes, imageUrl } = parseIntervalAndImage(intervalRaw, content);

        let id;
        if (isEdit && session && session.editingId) {
          id = session.editingId;
        } else {
          const existingList = await loadAnnouncements(interaction.guildId);
          id = generateNextId(existingList);
        }

        const targetChannelId = (session && session.targetChannelId) ? session.targetChannelId : interaction.channelId;

        const announcementObj = {
          id,
          guildId: interaction.guildId,
          title,
          content,
          targetChannelId,
          type: intervalMinutes ? 'interval' : 'once',
          executeAt,
          intervalMinutes,
          rolePing: 'everyone',
          imageUrl,
          createdBy: interaction.user.tag,
          createdAt: new Date().toISOString(),
          active: true,
          isNewCreation: true
        };

        await saveAnnouncement(announcementObj);
        scheduleItem(client, announcementObj);

        const startUnix = Math.floor(new Date(executeAt).getTime() / 1000);
        const nowMs = Date.now();
        const startMs = new Date(executeAt).getTime();

        let timeDetails = `⏰ **First Announcement**: <t:${startUnix}:F> (<t:${startUnix}:R>)`;
        if (startMs <= nowMs + 5000) {
          timeDetails = `⚡ **First Announcement**: Sent immediately`;
        }

        let repeatDetails = '';
        if (intervalMinutes) {
          if (intervalMinutes >= 1440 && intervalMinutes % 1440 === 0) {
            repeatDetails = `\n⏱️ **Repeat Interval**: Every ${intervalMinutes / 1440} day(s)`;
          } else if (intervalMinutes >= 60 && intervalMinutes % 60 === 0) {
            repeatDetails = `\n⏱️ **Repeat Interval**: Every ${intervalMinutes / 60} hour(s)`;
          } else {
            repeatDetails = `\n⏱️ **Repeat Interval**: Every ${intervalMinutes} minute(s)`;
          }
        }

        await interaction.reply({
          content: `✅ **Announcement "${title}" [ID: \`${id}\`] ${isEdit ? 'updated' : 'scheduled'} for <#${targetChannelId}>!**\n${timeDetails}${repeatDetails}`,
          ephemeral: true
        });
      }
    }

  } catch (error) {
    console.error('Error handling interaction:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ An error occurred while executing this command.', ephemeral: true });
    }
  }
});

// Start Client
client.login(token);
