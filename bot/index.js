const { 
  Client, 
  GatewayIntentBits, 
  Events,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { isAllianceLeader } = require('./commands/announce');
const { initScheduler, scheduleItem, cancelScheduledJob } = require('./services/scheduler');
const { saveAnnouncement, loadAnnouncements, deleteAnnouncement, matchId } = require('./services/database');

const token = process.env.DISCORD_TOKEN;
if (!token) { console.error('❌ DISCORD_TOKEN missing!'); process.exit(1); }

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('🤖 Wolfie Alliance Discord Bot is Online 24/7!');
}).listen(PORT, () => console.log(`🌐 Keep-Alive HTTP Server on port ${PORT}`));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
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

function parseDateTime(timeRaw, dateRaw) {
  const tStr = (timeRaw || 'now').trim().toLowerCase();
  const dStr = (dateRaw || 'today').trim().toLowerCase();
  if (tStr === 'now') return new Date().toISOString();

  const now = new Date();
  let year = now.getFullYear(), month = now.getMonth(), day = now.getDate();
  if (dStr === 'tomorrow') {
    const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
    year = tmr.getFullYear(); month = tmr.getMonth(); day = tmr.getDate();
  } else if (dStr !== 'today' && dStr !== '' && dStr !== 'skip') {
    const m = dStr.match(/^(\d{2})[-/]?(\d{2})[-/]?(\d{4})$/);
    if (m) { day = parseInt(m[1]); month = parseInt(m[2]) - 1; year = parseInt(m[3]); }
  }

  let hours = now.getHours(), minutes = now.getMinutes();
  const tm = tStr.match(/^(\d{1,2}):(\d{2})$/);
  if (tm) { hours = parseInt(tm[1]); minutes = parseInt(tm[2]); }

  const target = new Date(year, month, day, hours, minutes, 0, 0);
  if ((dStr === 'today' || dStr === '') && target.getTime() <= Date.now()) {
    target.setDate(target.getDate() + 1);
  }
  return target.toISOString();
}

function parseInterval(inputRaw) {
  const str = (inputRaw || 'none').trim().toLowerCase();
  if (!str || str === 'none' || str === '0' || str === 'skip') return null;
  if (/^\d{8}$/.test(str)) return null;
  if (str.includes('h') || str.includes('hour')) {
    const m = str.match(/^(\d+(?:\.\d+)?)/);
    if (m) return Math.round(parseFloat(m[1]) * 60);
  }
  if (str.includes('d') || str.includes('day')) {
    const m = str.match(/^(\d+(?:\.\d+)?)/);
    if (m) return Math.round(parseFloat(m[1]) * 1440);
  }
  const m = str.match(/^(\d+(?:\.\d+)?)/);
  if (m) { const mins = Math.round(parseFloat(m[1])); return mins > 525600 ? null : mins; }
  return null;
}

function intervalToString(intervalMinutes) {
  if (!intervalMinutes) return 'none';
  if (intervalMinutes >= 1440 && intervalMinutes % 1440 === 0) return `${intervalMinutes / 1440} days`;
  if (intervalMinutes >= 60 && intervalMinutes % 60 === 0) return `${intervalMinutes / 60} hours`;
  return `${intervalMinutes} minutes`;
}

// ─────────────────────────────────────────────
// Build the List Embed + Controls
// ─────────────────────────────────────────────
function buildListComponents(list, selectedId = null) {
  const embed = new EmbedBuilder()
    .setTitle(`📜 ${list.length} Scheduled Announcement${list.length !== 1 ? 's' : ''}`)
    .setColor(0x5865F2)
    .setTimestamp();

  list.forEach(item => {
    const nextTime = new Date(item.executeAt);
    const unix = Math.floor(nextTime.getTime() / 1000);
    const repeat = item.intervalMinutes ? `Repeating every ${intervalToString(item.intervalMinutes)}` : 'One-time';
    embed.addFields({
      name: `[ID: ${item.id}] ${item.title}`,
      value: `📍 <#${item.targetChannelId}>\n🕐 <t:${unix}:F> (<t:${unix}:R>)\n🔁 ${repeat}`,
      inline: false
    });
  });

  const components = [];

  // Dropdown to select an announcement
  if (list.length > 0) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('list_select_announcement')
      .setPlaceholder('Select an announcement to manage...')
      .addOptions(list.map(item => ({
        label: `[${item.id}] ${item.title.substring(0, 80)}`,
        value: item.id,
        description: `📍 ${item.targetChannelId ? 'Channel set' : 'No channel'} • 🔁 ${intervalToString(item.intervalMinutes)}`,
        default: item.id === selectedId
      })));
    components.push(new ActionRowBuilder().addComponents(selectMenu));
  }

  // Edit / Delete buttons — only active when something is selected
  const editBtn = new ButtonBuilder()
    .setCustomId(selectedId ? `ann_edit_${selectedId}` : 'ann_edit_none')
    .setLabel('✏️  Edit Selected')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(!selectedId);

  const deleteBtn = new ButtonBuilder()
    .setCustomId(selectedId ? `ann_delete_${selectedId}` : 'ann_delete_none')
    .setLabel('🗑️  Delete Selected')
    .setStyle(ButtonStyle.Danger)
    .setDisabled(!selectedId);

  components.push(new ActionRowBuilder().addComponents(editBtn, deleteBtn));

  return { embed, components };
}

// ─────────────────────────────────────────────
// Build Edit Modal pre-filled with item values
// ─────────────────────────────────────────────
function buildEditModal(item) {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const dateStr = `${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}${now.getFullYear()}`;

  const modal = new ModalBuilder()
    .setCustomId(`modal_edit_ann_${item.id}`)
    .setTitle(`Edit [ID: ${item.id}] ${item.title.substring(0, 30)}`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('edit_title')
        .setLabel('Title')
        .setStyle(TextInputStyle.Short)
        .setValue(item.title || '')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('edit_body')
        .setLabel('Message Body')
        .setStyle(TextInputStyle.Paragraph)
        .setValue(item.content || '')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('edit_time')
        .setLabel(`Start Time HH:MM  (Bot now: ${timeStr})`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`"now" or "${timeStr}"`)
        .setValue('now')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('edit_date')
        .setLabel(`Start Date DDMMYYYY  (Today: ${dateStr})`)
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(`"today", "tomorrow", or "${dateStr}"`)
        .setValue('today')
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('edit_interval')
        .setLabel('Repeat Interval')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('"none", "36 hours", "3 days", "45 minutes"')
        .setValue(intervalToString(item.intervalMinutes))
        .setRequired(false)
    )
  );

  return modal;
}

// ─────────────────────────────────────────────
// Bot Events
// ─────────────────────────────────────────────
client.once(Events.ClientReady, async (c) => {
  console.log('----------------------------------------------------');
  console.log(`🤖 Wolfie Bot ONLINE as ${c.user.tag}`);
  console.log(`🛡️ Server Count: ${c.guilds.cache.size}`);
  console.log('----------------------------------------------------');
  await initScheduler(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // ── Slash Commands ──────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const { commandName, member, guildId } = interaction;

      if (!isAllianceLeader(member)) {
        return interaction.reply({ content: '❌ Only R4/R5 Alliance Leaders can use bot commands.', ephemeral: true });
      }

      // ── /create ────────────────────────────────────────────────────────────
      if (commandName === 'create') {
        const targetChannel = interaction.options.getChannel('channel');
        const title       = interaction.options.getString('title');
        const content     = interaction.options.getString('body');
        const timeRaw     = interaction.options.getString('time') || 'now';
        const dateRaw     = interaction.options.getString('date') || 'today';
        const intervalRaw = interaction.options.getString('interval') || 'none';
        const imageUrl    = interaction.options.getString('image') || null;

        const executeAt      = parseDateTime(timeRaw, dateRaw);
        const intervalMinutes = parseInterval(intervalRaw);
        const existingList   = await loadAnnouncements(guildId);
        const id             = generateNextId(existingList);

        const announcementObj = {
          id, guildId, title, content,
          targetChannelId: targetChannel.id,
          type: intervalMinutes ? 'interval' : 'once',
          executeAt, intervalMinutes, rolePing: 'everyone', imageUrl,
          createdBy: interaction.user.tag,
          createdAt: new Date().toISOString(),
          active: true, isNewCreation: true
        };

        await saveAnnouncement(announcementObj);
        scheduleItem(client, announcementObj);

        const startUnix = Math.floor(new Date(executeAt).getTime() / 1000);
        const isNow = new Date(executeAt).getTime() <= Date.now() + 5000;
        let reply = isNow
          ? `✅ **"${title}" [ID: \`${id}\`]** → <#${targetChannel.id}>\n⚡ **First Send**: Immediately`
          : `✅ **"${title}" [ID: \`${id}\`]** → <#${targetChannel.id}>\n⏰ **First Send**: <t:${startUnix}:F> (<t:${startUnix}:R>)`;
        if (intervalMinutes) reply += `\n🔁 **Repeat**: Every ${intervalToString(intervalMinutes)}`;

        return interaction.reply({ content: reply, ephemeral: true });

      // ── /list ──────────────────────────────────────────────────────────────
      } else if (commandName === 'list') {
        const list = await loadAnnouncements(guildId);
        if (list.length === 0) {
          return interaction.reply({ content: 'ℹ️ No active announcements. Use `/create` to add one.', ephemeral: true });
        }
        const { embed, components } = buildListComponents(list, null);
        return interaction.reply({ embeds: [embed], components, ephemeral: true });

      // ── /delete ────────────────────────────────────────────────────────────
      } else if (commandName === 'delete') {
        const id = interaction.options.getString('id');
        cancelScheduledJob(id);
        const { success } = await deleteAnnouncement(id, interaction.guildId);
        return interaction.reply({
          content: success ? `✅ Deleted announcement \`${id}\`.` : `❌ ID \`${id}\` not found. Use \`/list\`.`,
          ephemeral: true
        });

      // ── /preset ────────────────────────────────────────────────────────────
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

    // ── Select Menus ─────────────────────────────────────────────────────────
    } else if (interaction.isStringSelectMenu()) {

      // Announcement selector in /list view
      if (interaction.customId === 'list_select_announcement') {
        const selectedId = interaction.values[0];
        const list = await loadAnnouncements(interaction.guildId);
        const { embed, components } = buildListComponents(list, selectedId);
        return interaction.update({ embeds: [embed], components });
      }

      // Preset selector
      if (interaction.customId === 'select_announce_preset') {
        const presetKey = interaction.values[0];
        let title = '', content = '';
        if (presetKey === 'preset_desert_storm') { title = '🌵 Desert Storm Match Reminder'; content = 'Desert Storm battle is approaching! All fighters prepare your squads!'; }
        else if (presetKey === 'preset_canyon_storm') { title = '⛈️ Canyon Storm Battle Readiness'; content = 'Canyon Storm is starting soon! Ensure rallies are assigned!'; }
        else if (presetKey === 'preset_tech_reset') { title = '💡 Tech Donation & Daily Arms Race'; content = 'Daily reset! Donate max diamonds/rss to Alliance Tech!'; }

        const channels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).first(25);
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`select_preset_channel_${presetKey}`)
          .setPlaceholder(`Select channel for: ${title}`)
          .addOptions(channels.map(c => ({ label: `#${c.name}`, value: c.id })));
        return interaction.update({ content: `🎯 **${title}** — Select channel:`, components: [new ActionRowBuilder().addComponents(selectMenu)] });
      }

      // Preset channel selector
      if (interaction.customId.startsWith('select_preset_channel_')) {
        const targetChannelId = interaction.values[0];
        const presetKey = interaction.customId.replace('select_preset_channel_', '');
        let title = '', content = '', intervalMinutes = 30;
        if (presetKey === 'preset_desert_storm') { title = '🌵 Desert Storm Match Reminder'; content = 'Desert Storm battle is approaching!'; intervalMinutes = 30; }
        else if (presetKey === 'preset_canyon_storm') { title = '⛈️ Canyon Storm Battle Readiness'; content = 'Canyon Storm is starting soon!'; intervalMinutes = 15; }
        else if (presetKey === 'preset_tech_reset') { title = '💡 Tech Donation & Daily Arms Race'; content = 'Daily reset! Donate max diamonds/rss!'; intervalMinutes = 1440; }

        const existingList = await loadAnnouncements(interaction.guildId);
        const nextId = generateNextId(existingList);
        const item = { id: nextId, guildId: interaction.guildId, title, content, targetChannelId, type: 'interval', executeAt: new Date().toISOString(), intervalMinutes, rolePing: 'everyone', createdBy: interaction.user.tag, createdAt: new Date().toISOString(), active: true, isNewCreation: true };
        await saveAnnouncement(item);
        scheduleItem(client, item);
        return interaction.update({ content: `✅ **${title}** [ID: \`${nextId}\`] activated in <#${targetChannelId}>!`, components: [] });
      }

    // ── Buttons ───────────────────────────────────────────────────────────────
    } else if (interaction.isButton()) {
      const { customId, guildId } = interaction;

      // Edit button → open pre-filled modal
      if (customId.startsWith('ann_edit_')) {
        const id = customId.replace('ann_edit_', '');
        const list = await loadAnnouncements(guildId);
        const item = list.find(a => matchId(a.id, id));
        if (!item) return interaction.reply({ content: `❌ Announcement \`${id}\` not found.`, ephemeral: true });
        return interaction.showModal(buildEditModal(item));
      }

      // Delete button → delete and refresh list
      if (customId.startsWith('ann_delete_')) {
        const id = customId.replace('ann_delete_', '');
        cancelScheduledJob(id);
        const { success } = await deleteAnnouncement(id, guildId);

        if (!success) {
          return interaction.reply({ content: `❌ Could not delete \`${id}\`.`, ephemeral: true });
        }

        const updatedList = await loadAnnouncements(guildId);
        if (updatedList.length === 0) {
          return interaction.update({ content: '✅ Deleted! No more announcements scheduled.', embeds: [], components: [] });
        }
        const { embed, components } = buildListComponents(updatedList, null);
        return interaction.update({ content: `✅ Deleted \`${id}\`!`, embeds: [embed], components });
      }

    // ── Modal Submits ─────────────────────────────────────────────────────────
    } else if (interaction.isModalSubmit()) {

      if (interaction.customId.startsWith('modal_edit_ann_')) {
        const id = interaction.customId.replace('modal_edit_ann_', '');
        const list = await loadAnnouncements(interaction.guildId);
        const item = list.find(a => matchId(a.id, id));
        if (!item) return interaction.reply({ content: `❌ Announcement \`${id}\` not found.`, ephemeral: true });

        const title       = interaction.fields.getTextInputValue('edit_title').trim();
        const content     = interaction.fields.getTextInputValue('edit_body').trim();
        const timeRaw     = interaction.fields.getTextInputValue('edit_time').trim();
        const dateRaw     = interaction.fields.getTextInputValue('edit_date').trim();
        const intervalRaw = interaction.fields.getTextInputValue('edit_interval').trim();

        const timeChanged = timeRaw.toLowerCase() !== 'now' || dateRaw.toLowerCase() !== 'today';
        const executeAt   = (timeRaw.toLowerCase() === 'now' && dateRaw.toLowerCase() === 'today')
          ? item.executeAt
          : parseDateTime(timeRaw, dateRaw);
        const intervalMinutes = parseInterval(intervalRaw);

        const updated = {
          ...item,
          title, content, executeAt, intervalMinutes,
          isNewCreation: timeChanged
        };

        cancelScheduledJob(item.id);
        await saveAnnouncement(updated);
        scheduleItem(client, updated);

        // Refresh the list embed
        const updatedList = await loadAnnouncements(interaction.guildId);
        const { embed, components } = buildListComponents(updatedList, id);

        return interaction.update({ content: `✅ **"${title}" [ID: \`${id}\`]** updated!`, embeds: [embed], components });
      }
    }

  } catch (error) {
    console.error('Interaction error:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
      }
    } catch (_) {}
  }
});

client.login(token);
