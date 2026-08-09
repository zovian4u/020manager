const { 
  Client, 
  GatewayIntentBits, 
  Events,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ChannelType
} = require('discord.js');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { isAllianceLeader } = require('./commands/announce');
const { initScheduler, scheduleItem, cancelScheduledJob } = require('./services/scheduler');
const { saveAnnouncement, loadAnnouncements, deleteAnnouncement, matchId } = require('./services/database');

const token = process.env.DISCORD_TOKEN;
if (!token) { console.error('❌ DISCORD_TOKEN missing!'); process.exit(1); }

// Keep-alive HTTP server for Render & UptimeRobot
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
 * Parse Start Date & Time from separate time (HH:MM) and date (DDMMYYYY) strings
 */
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
        const targetChannel = interaction.options.getChannel('channel');
        const title   = interaction.options.getString('title');
        const content = interaction.options.getString('body');
        const timeRaw = interaction.options.getString('time') || 'now';
        const dateRaw = interaction.options.getString('date') || 'today';
        const intervalRaw = interaction.options.getString('interval') || 'none';
        const imageUrl = interaction.options.getString('image') || null;

        const executeAt = parseDateTime(timeRaw, dateRaw);
        const intervalMinutes = parseInterval(intervalRaw);

        const existingList = await loadAnnouncements(guildId);
        const id = generateNextId(existingList);

        const announcementObj = {
          id, guildId, title, content,
          targetChannelId: targetChannel.id,
          type: intervalMinutes ? 'interval' : 'once',
          executeAt, intervalMinutes,
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
        const isNow = new Date(executeAt).getTime() <= Date.now() + 5000;
        let timeDetails = isNow
          ? `⚡ **First Send**: Immediately`
          : `⏰ **First Send**: <t:${startUnix}:F> (<t:${startUnix}:R>)`;

        let repeatDetails = '';
        if (intervalMinutes) {
          if (intervalMinutes >= 1440 && intervalMinutes % 1440 === 0) repeatDetails = `\n⏱️ **Repeat**: Every ${intervalMinutes/1440} day(s)`;
          else if (intervalMinutes >= 60 && intervalMinutes % 60 === 0) repeatDetails = `\n⏱️ **Repeat**: Every ${intervalMinutes/60} hour(s)`;
          else repeatDetails = `\n⏱️ **Repeat**: Every ${intervalMinutes} minute(s)`;
        }

        return interaction.reply({
          content: `✅ **"${title}" [ID: \`${id}\`] scheduled for <#${targetChannel.id}>!**\n${timeDetails}${repeatDetails}`,
          ephemeral: true
        });

      } else if (commandName === 'edit') {
        const id = interaction.options.getString('id');
        const list = await loadAnnouncements(guildId);
        const item = list.find(a => matchId(a.id, id));
        if (!item) return interaction.reply({ content: `❌ ID \`${id}\` not found. Use \`/list\` to see active IDs.`, ephemeral: true });

        const title   = interaction.options.getString('title')    || item.title;
        const content = interaction.options.getString('body')     || item.content;
        const timeRaw = interaction.options.getString('time')     || 'now';
        const dateRaw = interaction.options.getString('date')     || 'today';
        const intervalRaw = interaction.options.getString('interval');
        const imageInput  = interaction.options.getString('image');

        const executeAt = parseDateTime(timeRaw, dateRaw);
        const intervalMinutes = intervalRaw !== null ? parseInterval(intervalRaw) : item.intervalMinutes;
        const imageUrl = imageInput === 'none' ? null : (imageInput || item.imageUrl);

        const updated = {
          ...item,
          title, content, executeAt, intervalMinutes, imageUrl,
          isNewCreation: true
        };

        cancelScheduledJob(item.id);
        await saveAnnouncement(updated);
        scheduleItem(client, updated);

        const startUnix = Math.floor(new Date(executeAt).getTime() / 1000);
        const isNow = new Date(executeAt).getTime() <= Date.now() + 5000;
        const timeDetails = isNow ? `⚡ Sent immediately` : `<t:${startUnix}:F> (<t:${startUnix}:R>)`;

        return interaction.reply({
          content: `✅ **"${title}" [ID: \`${id}\`] updated!** First send: ${timeDetails}`,
          ephemeral: true
        });

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
        return interaction.reply({
          content: success ? `✅ Deleted announcement \`${id}\`.` : `❌ ID \`${id}\` not found. Use \`/list\`.`,
          ephemeral: true
        });

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

      } else if (interaction.customId.startsWith('select_preset_channel_')) {
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
    }

  } catch (error) {
    console.error('Interaction error:', error);
    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => {});
    }
  }
});

client.login(token);
