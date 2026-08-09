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
 * Parse Start Date & Time (24h HH:MM format + optional DDMMYYYY date format):
 * Examples:
 * - "now" -> Current time
 * - "18:00" -> 18:00 today (or tomorrow if passed)
 * - "18:00 10082026" -> 18:00 on 10th August 2026
 * - "10082026 18:00" -> 18:00 on 10th August 2026
 */
function parseStartTime(inputRaw) {
  const str = (inputRaw || 'now').trim();
  const lower = str.toLowerCase();

  if (lower === 'now' || lower === '0') {
    return new Date().toISOString();
  }

  // 1. Time (HH:MM) + Date (DDMMYYYY) e.g. "18:00 10082026"
  const timeDateMatch = str.match(/^(\d{1,2}):(\d{2})\s+(\d{2})(\d{2})(\d{4})$/);
  if (timeDateMatch) {
    const hours = parseInt(timeDateMatch[1], 10);
    const minutes = parseInt(timeDateMatch[2], 10);
    const day = parseInt(timeDateMatch[3], 10);
    const month = parseInt(timeDateMatch[4], 10) - 1;
    const year = parseInt(timeDateMatch[5], 10);

    const target = new Date(year, month, day, hours, minutes, 0, 0);
    return target.toISOString();
  }

  // 2. Date (DDMMYYYY) + Time (HH:MM) e.g. "10082026 18:00"
  const dateTimeMatch = str.match(/^(\d{2})(\d{2})(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (dateTimeMatch) {
    const day = parseInt(dateTimeMatch[1], 10);
    const month = parseInt(dateTimeMatch[2], 10) - 1;
    const year = parseInt(dateTimeMatch[3], 10);
    const hours = parseInt(dateTimeMatch[4], 10);
    const minutes = parseInt(dateTimeMatch[5], 10);

    const target = new Date(year, month, day, hours, minutes, 0, 0);
    return target.toISOString();
  }

  // 3. Time (HH:MM) + Date with separators e.g. "18:00 10-08-2026"
  const timeSepMatch = str.match(/^(\d{1,2}):(\d{2})\s+(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (timeSepMatch) {
    const hours = parseInt(timeSepMatch[1], 10);
    const minutes = parseInt(timeSepMatch[2], 10);
    const day = parseInt(timeSepMatch[3], 10);
    const month = parseInt(timeSepMatch[4], 10) - 1;
    const year = parseInt(timeSepMatch[5], 10);

    const target = new Date(year, month, day, hours, minutes, 0, 0);
    return target.toISOString();
  }

  // 4. Time only (HH:MM 24-hr format) e.g. "18:00" or "09:30"
  const clockMatch = str.match(/^(\d{1,2}):(\d{2})$/);
  if (clockMatch) {
    const hours = parseInt(clockMatch[1], 10);
    const minutes = parseInt(clockMatch[2], 10);
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    if (target.getTime() <= Date.now()) {
      target.setDate(target.getDate() + 1);
    }
    return target.toISOString();
  }

  const parsedDate = Date.parse(str);
  if (!isNaN(parsedDate)) {
    return new Date(parsedDate).toISOString();
  }

  return new Date().toISOString();
}

/**
 * Parse Custom Time Interval in minutes, hours, or days
 */
function parseInterval(inputRaw) {
  const str = (inputRaw || 'none').trim().toLowerCase();

  if (str === 'none' || str === '0' || str === 'off' || str === 'no') {
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
    return Math.round(mins);
  }

  return null;
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
          .setLabel(`Start Time (HH:MM DDMMYYYY or now)`)
          .setPlaceholder(`e.g. "${timeStr}", "18:00 10082026", "now"`)
          .setValue('now')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

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

        const intervalInput = new TextInputBuilder()
          .setCustomId('announce_interval')
          .setLabel('Repeat Interval (none, 36h, 3 days)')
          .setPlaceholder('e.g. "none", "36 hours", "45 minutes", "3 days"')
          .setValue(existingIntervalStr)
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        const imageInput = new TextInputBuilder()
          .setCustomId('announce_image')
          .setLabel('Image (Copy Message Link)')
          .setPlaceholder('Right click image msg -> Copy Message Link')
          .setValue(item.imageUrl || '')
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(titleInput),
          new ActionRowBuilder().addComponents(contentInput),
          new ActionRowBuilder().addComponents(startTimeInput),
          new ActionRowBuilder().addComponents(intervalInput),
          new ActionRowBuilder().addComponents(imageInput)
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
          .setLabel('Start Time (HH:MM DDMMYYYY or now)')
          .setPlaceholder(`e.g. "${timeStr}", "18:00 10082026", "now"`)
          .setStyle(TextInputStyle.Short)
          .setValue('now')
          .setRequired(true);

        const intervalInput = new TextInputBuilder()
          .setCustomId('announce_interval')
          .setLabel('Repeat Interval (none, 36h, 3 days)')
          .setPlaceholder('e.g. "none", "36 hours", "45 minutes", "3 days"')
          .setStyle(TextInputStyle.Short)
          .setValue('none')
          .setRequired(false);

        const imageInput = new TextInputBuilder()
          .setCustomId('announce_image')
          .setLabel('Image (Copy Message Link)')
          .setPlaceholder('Right click image msg -> Copy Message Link')
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(titleInput),
          new ActionRowBuilder().addComponents(contentInput),
          new ActionRowBuilder().addComponents(startTimeInput),
          new ActionRowBuilder().addComponents(intervalInput),
          new ActionRowBuilder().addComponents(imageInput)
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

        const title = interaction.fields.getTextInputValue('announce_title');
        let content = interaction.fields.getTextInputValue('announce_content');
        const startTimeRaw = interaction.fields.getTextInputValue('announce_start_time');
        const intervalRaw = interaction.fields.getTextInputValue('announce_interval');
        const imageRaw = interaction.fields.getTextInputValue('announce_image');

        const executeAt = parseStartTime(startTimeRaw);
        const intervalMinutes = parseInterval(intervalRaw);

        // Check explicit image input field FIRST, then fallback to Message Body link detection
        let imageUrl = imageRaw ? imageRaw.trim() : null;
        if (!imageUrl) {
          const msgLinkMatch = content.match(/https:\/\/discord\.com\/channels\/\d+\/(\d+)\/(\d+)/);
          const directUrlMatch = content.match(/(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp))/i);
          if (msgLinkMatch) {
            imageUrl = msgLinkMatch[0];
          } else if (directUrlMatch) {
            imageUrl = directUrlMatch[0];
          }
        }

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

        let actionText = isEdit ? 'updated' : 'posted';
        const startUnix = Math.floor(new Date(executeAt).getTime() / 1000);
        let timeSnippet = `scheduled for <t:${startUnix}:F> (<t:${startUnix}:R>)`;
        if (new Date(executeAt).getTime() <= Date.now() + 5000) {
          timeSnippet = 'sent immediately';
        }

        await interaction.reply({
          content: `✅ Announcement **"${title}"** [ID: \`${id}\`] ${actionText} successfully (${timeSnippet}) for <#${targetChannelId}>!`,
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
