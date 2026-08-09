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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const sessionState = new Map();

function generateNextId(list) {
  let maxId = 0;
  if (Array.isArray(list)) {
    list.forEach(item => {
      const num = parseInt(String(item.id).replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxId) maxId = num;
    });
  }
  return String(maxId + 1).padStart(3, '0');
}

/**
 * Parse Start Time & Date from a single combined field.
 * Supports:
 *   "now" → immediately
 *   "18:00" → today at 18:00 (or tomorrow if passed)
 *   "18:00 10082026" → 18:00 on 10 Aug 2026
 *   "10082026 18:00" → same
 */
function parseStartTime(inputRaw) {
  const str = (inputRaw || 'now').trim();
  const lower = str.toLowerCase();

  if (lower === 'now' || lower === '0') return new Date().toISOString();

  // "18:00 10082026"
  const m1 = str.match(/^(\d{1,2}):(\d{2})\s+(\d{2})(\d{2})(\d{4})$/);
  if (m1) {
    return new Date(parseInt(m1[5]), parseInt(m1[4])-1, parseInt(m1[3]), parseInt(m1[1]), parseInt(m1[2])).toISOString();
  }

  // "10082026 18:00"
  const m2 = str.match(/^(\d{2})(\d{2})(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (m2) {
    return new Date(parseInt(m2[3]), parseInt(m2[2])-1, parseInt(m2[1]), parseInt(m2[4]), parseInt(m2[5])).toISOString();
  }

  // "18:00" only
  const m3 = str.match(/^(\d{1,2}):(\d{2})$/);
  if (m3) {
    const t = new Date();
    t.setHours(parseInt(m3[1]), parseInt(m3[2]), 0, 0);
    if (t.getTime() <= Date.now()) t.setDate(t.getDate() + 1);
    return t.toISOString();
  }

  const parsed = Date.parse(str);
  if (!isNaN(parsed)) return new Date(parsed).toISOString();
  return new Date().toISOString();
}

function parseInterval(inputRaw) {
  const str = (inputRaw || 'none').trim().toLowerCase();
  if (!str || str === 'none' || str === '0' || str === 'off' || str === 'no') return null;
  if (/^\d{8}$/.test(str)) return null; // reject date strings

  if (str.includes('h') || str.includes('hour')) {
    const m = str.match(/^(\d+(?:\.\d+)?)/);
    if (m) return Math.round(parseFloat(m[1]) * 60);
  }
  if (str.includes('d') || str.includes('day')) {
    const m = str.match(/^(\d+(?:\.\d+)?)/);
    if (m) return Math.round(parseFloat(m[1]) * 1440);
  }
  const m = str.match(/^(\d+(?:\.\d+)?)/);
  if (m) {
    const mins = Math.round(parseFloat(m[1]));
    if (mins > 525600) return null;
    return mins;
  }
  return null;
}

/**
 * Build the 5-field modal for creating/editing an announcement.
 * Fields:
 *  1. Title
 *  2. Message Body
 *  3. Start Time & Date (HH:MM DDMMYYYY or "now") — combined
 *  4. Repeat Interval
 *  5. Image (Copy Message Link)
 */
function buildAnnounceModal(customId, title, defaults = {}) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const dateStr = `${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}${now.getFullYear()}`;

  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);

  const f1 = new TextInputBuilder()
    .setCustomId('announce_title')
    .setLabel('Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Marshall Event / Desert Storm')
    .setValue(defaults.title || '')
    .setRequired(true);

  const f2 = new TextInputBuilder()
    .setCustomId('announce_content')
    .setLabel('Message Body')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Enter strategy notes, instructions, or links...')
    .setValue(defaults.content || '')
    .setRequired(true);

  const f3 = new TextInputBuilder()
    .setCustomId('announce_start_time')
    .setLabel(`Start Time & Date (Bot now: ${timeStr} ${dateStr})`)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(`"now", "${timeStr}", or "${timeStr} ${dateStr}"`)
    .setValue(defaults.startTime || 'now')
    .setRequired(true);

  const f4 = new TextInputBuilder()
    .setCustomId('announce_interval')
    .setLabel('Repeat Interval')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. "none", "36 hours", "45 minutes", "3 days"')
    .setValue(defaults.interval || 'none')
    .setRequired(false);

  const f5 = new TextInputBuilder()
    .setCustomId('announce_image')
    .setLabel('Image (Copy Message Link)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Right click image message → Copy Message Link')
    .setValue(defaults.imageUrl || '')
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(f1),
    new ActionRowBuilder().addComponents(f2),
    new ActionRowBuilder().addComponents(f3),
    new ActionRowBuilder().addComponents(f4),
    new ActionRowBuilder().addComponents(f5)
  );

  return modal;
}

client.once(Events.ClientReady, async (c) => {
  console.log('----------------------------------------------------');
  console.log(`🤖 Wolfie Bot ONLINE as ${c.user.tag}`);
  console.log(`🛡️ Server Count: ${c.guilds.cache.size}`);
  console.log('----------------------------------------------------');
  await initScheduler(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName, member, guildId } = interaction;

      if (!isAllianceLeader(member)) {
        return interaction.reply({ content: '❌ Only R4/R5 Alliance Leaders can use bot commands.', ephemeral: true });
      }

      if (commandName === 'create') {
        const channels = interaction.guild.channels.cache
          .filter(c => c.type === ChannelType.GuildText).first(25);
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_announce_channel')
          .setPlaceholder('Select Target Channel...')
          .addOptions(channels.map(c => ({ label: `#${c.name}`, value: c.id, description: `Post to #${c.name}` })));
        return interaction.reply({ content: '📢 Select target channel:', components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });

      } else if (commandName === 'edit') {
        const id = interaction.options.getString('id');
        const list = await loadAnnouncements(guildId);
        const item = list.find(a => matchId(a.id, id));
        if (!item) return interaction.reply({ content: `❌ ID \`${id}\` not found. Use \`/list\` to see active IDs.`, ephemeral: true });

        sessionState.set(interaction.user.id, { editingId: item.id, targetChannelId: item.targetChannelId });

        let intervalStr = 'none';
        if (item.intervalMinutes) {
          if (item.intervalMinutes >= 1440 && item.intervalMinutes % 1440 === 0) intervalStr = `${item.intervalMinutes/1440} days`;
          else if (item.intervalMinutes >= 60 && item.intervalMinutes % 60 === 0) intervalStr = `${item.intervalMinutes/60} hours`;
          else intervalStr = `${item.intervalMinutes}m`;
        }

        const modal = buildAnnounceModal('modal_announce_edit', `Edit [ID: ${item.id}]`, {
          title: item.title || '',
          content: item.content || '',
          startTime: 'now',
          interval: intervalStr,
          imageUrl: item.imageUrl || ''
        });
        return interaction.showModal(modal);

      } else if (commandName === 'list') {
        const list = await loadAnnouncements(guildId);
        if (list.length === 0) return interaction.reply({ content: 'ℹ️ No active announcements for this server.', ephemeral: true });
        const embed = new EmbedBuilder().setTitle('📜 Active Announcements').setColor(0x5865F2).setTimestamp();
        list.forEach((item, i) => {
          let typeStr = 'One-time';
          if (item.intervalMinutes) typeStr = item.intervalMinutes >= 1440 ? `Every ${item.intervalMinutes/1440} day(s)` : `Every ${item.intervalMinutes}m`;
          embed.addFields({ name: `${i+1}. [ID: ${item.id}] ${item.title}`, value: `📍 <#${item.targetChannelId}>\n⏱️ ${typeStr}\n👤 ${item.createdBy || 'Alliance Leader'}`, inline: false });
        });
        return interaction.reply({ embeds: [embed], ephemeral: true });

      } else if (commandName === 'delete') {
        const id = interaction.options.getString('id');
        cancelScheduledJob(id);
        const { success } = await deleteAnnouncement(id, interaction.guildId);
        return interaction.reply({ content: success ? `✅ Deleted announcement \`${id}\`.` : `❌ ID \`${id}\` not found. Use \`/list\`.`, ephemeral: true });

      } else if (commandName === 'preset') {
        const presetsMenu = new StringSelectMenuBuilder()
          .setCustomId('select_announce_preset')
          .setPlaceholder('Choose Alliance Event Preset...')
          .addOptions([
            { label: '🌵 Desert Storm (30m Alert)', value: 'preset_desert_storm', description: 'Recurring match readiness alerts' },
            { label: '⛈️ Canyon Storm (15m Alert)', value: 'preset_canyon_storm', description: 'Rally and deployment reminder' },
            { label: '💡 Tech Donation & Daily Reset', value: 'preset_tech_reset', description: 'Daily tech donations & arms race alert' }
          ]);
        return interaction.reply({ content: '⚡ Select a preset:', components: [new ActionRowBuilder().addComponents(presetsMenu)], ephemeral: true });
      }

    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_announce_channel') {
        const targetChannelId = interaction.values[0];
        sessionState.set(interaction.user.id, { targetChannelId });
        const modal = buildAnnounceModal('modal_announce_submit', 'Create Alliance Announcement');
        return interaction.showModal(modal);

      } else if (interaction.customId === 'select_announce_preset') {
        const presetKey = interaction.values[0];
        let title = '', content = '';
        if (presetKey === 'preset_desert_storm') { title = '🌵 Desert Storm Match Reminder'; content = 'Desert Storm battle is approaching! All fighters prepare your squads!'; }
        else if (presetKey === 'preset_canyon_storm') { title = '⛈️ Canyon Storm Battle Readiness'; content = 'Canyon Storm is starting soon! Ensure rallies are assigned!'; }
        else if (presetKey === 'preset_tech_reset') { title = '💡 Tech Donation & Daily Arms Race'; content = 'Daily reset! Donate max diamonds/rss to Alliance Tech!'; }

        const channels = interaction.guild.channels.cache.filter(c => c.type === 0).first(25);
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`select_preset_channel_${presetKey}`)
          .setPlaceholder(`Select channel for: ${title}`)
          .addOptions(channels.map(c => ({ label: `#${c.name}`, value: c.id })));
        return interaction.reply({ content: `🎯 **${title}** — Select channel:`, components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });

      } else if (interaction.customId.startsWith('select_preset_channel_')) {
        const targetChannelId = interaction.values[0];
        const presetKey = interaction.customId.replace('select_preset_channel_', '');
        let title = '', content = '', intervalMinutes = 30;
        if (presetKey === 'preset_desert_storm') { title = '🌵 Desert Storm Match Reminder'; content = 'Desert Storm battle is approaching! All fighters prepare your squads!'; intervalMinutes = 30; }
        else if (presetKey === 'preset_canyon_storm') { title = '⛈️ Canyon Storm Battle Readiness'; content = 'Canyon Storm is starting soon! Ensure rallies are assigned!'; intervalMinutes = 15; }
        else if (presetKey === 'preset_tech_reset') { title = '💡 Tech Donation & Daily Arms Race'; content = 'Daily reset! Donate max diamonds/rss to Alliance Tech!'; intervalMinutes = 1440; }

        const existingList = await loadAnnouncements(interaction.guildId);
        const nextId = generateNextId(existingList);
        const item = { id: nextId, guildId: interaction.guildId, title, content, targetChannelId, type: 'interval', executeAt: new Date().toISOString(), intervalMinutes, rolePing: 'everyone', createdBy: interaction.user.tag, createdAt: new Date().toISOString(), active: true, isNewCreation: true };
        await saveAnnouncement(item);
        scheduleItem(client, item);
        return interaction.reply({ content: `✅ Preset **${title}** [ID: \`${nextId}\`] activated in <#${targetChannelId}>!`, ephemeral: true });
      }

    } else if (interaction.isModalSubmit()) {
      if (interaction.customId === 'modal_announce_submit' || interaction.customId === 'modal_announce_edit') {
        const isEdit = interaction.customId === 'modal_announce_edit';
        const session = sessionState.get(interaction.user.id);

        const title = interaction.fields.getTextInputValue('announce_title').trim();
        const content = interaction.fields.getTextInputValue('announce_content').trim();
        const startTimeRaw = interaction.fields.getTextInputValue('announce_start_time');
        const intervalRaw = interaction.fields.getTextInputValue('announce_interval');
        const imageRaw = interaction.fields.getTextInputValue('announce_image').trim();

        const executeAt = parseStartTime(startTimeRaw);
        const intervalMinutes = parseInterval(intervalRaw);
        const imageUrl = imageRaw || null;

        let id;
        if (isEdit && session?.editingId) {
          id = session.editingId;
        } else {
          const existingList = await loadAnnouncements(interaction.guildId);
          id = generateNextId(existingList);
        }

        const targetChannelId = session?.targetChannelId || interaction.channelId;

        const announcementObj = {
          id, guildId: interaction.guildId, title, content, targetChannelId,
          type: intervalMinutes ? 'interval' : 'once',
          executeAt, intervalMinutes, rolePing: 'everyone', imageUrl,
          createdBy: interaction.user.tag, createdAt: new Date().toISOString(),
          active: true, isNewCreation: true
        };

        await saveAnnouncement(announcementObj);
        scheduleItem(client, announcementObj);

        const startUnix = Math.floor(new Date(executeAt).getTime() / 1000);
        const isNow = new Date(executeAt).getTime() <= Date.now() + 5000;
        let timeDetails = isNow ? `⚡ **First Announcement**: Sent immediately` : `⏰ **First Announcement**: <t:${startUnix}:F> (<t:${startUnix}:R>)`;

        let repeatDetails = '';
        if (intervalMinutes) {
          if (intervalMinutes >= 1440 && intervalMinutes % 1440 === 0) repeatDetails = `\n⏱️ **Repeat**: Every ${intervalMinutes/1440} day(s)`;
          else if (intervalMinutes >= 60 && intervalMinutes % 60 === 0) repeatDetails = `\n⏱️ **Repeat**: Every ${intervalMinutes/60} hour(s)`;
          else repeatDetails = `\n⏱️ **Repeat**: Every ${intervalMinutes} minute(s)`;
        }

        return interaction.reply({
          content: `✅ **"${title}" [ID: \`${id}\`] ${isEdit ? 'updated' : 'scheduled'} for <#${targetChannelId}>!**\n${timeDetails}${repeatDetails}`,
          ephemeral: true
        });
      }
    }

  } catch (error) {
    console.error('Error handling interaction:', error);
    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
    }
  }
});

client.login(token);
