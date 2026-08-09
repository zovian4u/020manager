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
  ChannelType,
  ButtonBuilder,
  ButtonStyle
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
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ]
});

// Active conversation sessions: userId -> { step, data, messages[] }
const activeSessions = new Map();

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

function parseStartTime(timeRaw, dateRaw) {
  const tStr = (timeRaw || 'now').trim().toLowerCase();
  const dStr = (dateRaw || 'today').trim().toLowerCase();

  if (tStr === 'now') return new Date().toISOString();

  const now = new Date();
  let year = now.getFullYear(), month = now.getMonth(), day = now.getDate();

  if (dStr === 'tomorrow') {
    const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
    year = tmr.getFullYear(); month = tmr.getMonth(); day = tmr.getDate();
  } else if (dStr !== 'today' && dStr !== 'skip' && dStr !== '') {
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

// Delete all bot messages tracked in a session
async function cleanupSessionMessages(session) {
  for (const msg of (session.messages || [])) {
    try { await msg.delete(); } catch (_) {}
  }
}

// Ask a step question and return the sent message
async function askStep(channel, userId, question, hint = '') {
  const content = `${question}${hint ? `\n> 💡 *${hint}*` : ''}`;
  const msg = await channel.send({ content });
  return msg;
}

// Wait for a reply from the specific user
async function awaitReply(channel, userId, timeoutMs = 90000) {
  try {
    const collected = await channel.awaitMessages({
      filter: m => m.author.id === userId && !m.author.bot,
      max: 1,
      time: timeoutMs,
      errors: ['time']
    });
    return collected.first();
  } catch (e) {
    throw new Error('timeout');
  }
}

// Run the full step-by-step announcement creation flow
async function runCreateFlow(interaction, targetChannelId) {
  const channel = interaction.channel;
  const userId = interaction.user.id;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const dateStr = `${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}${now.getFullYear()}`;

  const session = { messages: [], data: { targetChannelId } };
  activeSessions.set(userId, session);

  try {
    // Step 1: Title
    let m = await askStep(channel, userId, '**Step 1/6 — Title:**', 'e.g. Marshall Event / Desert Storm');
    session.messages.push(m);
    const titleReply = await awaitReply(channel, userId);
    session.messages.push(titleReply);
    session.data.title = titleReply.content.trim();

    // Step 2: Body
    m = await askStep(channel, userId, '**Step 2/6 — Message Body:**', 'Enter the full announcement text');
    session.messages.push(m);
    const bodyReply = await awaitReply(channel, userId);
    session.messages.push(bodyReply);
    session.data.content = bodyReply.content.trim();

    // Step 3: Time
    m = await askStep(channel, userId, `**Step 3/6 — Start Time (HH:MM):**`, `Bot time now: ${timeStr} — type "now" to send immediately`);
    session.messages.push(m);
    const timeReply = await awaitReply(channel, userId);
    session.messages.push(timeReply);
    session.data.startTime = timeReply.content.trim();

    // Step 4: Date
    m = await askStep(channel, userId, `**Step 4/6 — Start Date (DDMMYYYY):**`, `Today: ${dateStr} — type "today" or "tomorrow" or a date like ${dateStr}`);
    session.messages.push(m);
    const dateReply = await awaitReply(channel, userId);
    session.messages.push(dateReply);
    session.data.startDate = dateReply.content.trim();

    // Step 5: Interval
    m = await askStep(channel, userId, '**Step 5/6 — Repeat Interval:**', 'e.g. "none", "36 hours", "45 minutes", "3 days"');
    session.messages.push(m);
    const intervalReply = await awaitReply(channel, userId);
    session.messages.push(intervalReply);
    session.data.interval = intervalReply.content.trim();

    // Step 6: Image
    m = await askStep(channel, userId, '**Step 6/6 — Image Link:**', 'Right click an image message → Copy Message Link — or type "skip"');
    session.messages.push(m);
    const imageReply = await awaitReply(channel, userId);
    session.messages.push(imageReply);
    const imageRaw = imageReply.content.trim().toLowerCase() === 'skip' ? '' : imageReply.content.trim();
    session.data.imageUrl = imageRaw || null;

    // Clean up all conversation messages
    await cleanupSessionMessages(session);

    // Build announcement object
    const executeAt = parseStartTime(session.data.startTime, session.data.startDate);
    const intervalMinutes = parseInterval(session.data.interval);
    const existingList = await loadAnnouncements(interaction.guildId);
    const id = generateNextId(existingList);

    const announcementObj = {
      id,
      guildId: interaction.guildId,
      title: session.data.title,
      content: session.data.content,
      targetChannelId: session.data.targetChannelId,
      type: intervalMinutes ? 'interval' : 'once',
      executeAt,
      intervalMinutes,
      rolePing: 'everyone',
      imageUrl: session.data.imageUrl,
      createdBy: interaction.user.tag,
      createdAt: new Date().toISOString(),
      active: true,
      isNewCreation: true
    };

    await saveAnnouncement(announcementObj);
    scheduleItem(client, announcementObj);

    const startUnix = Math.floor(new Date(executeAt).getTime() / 1000);
    const isNow = new Date(executeAt).getTime() <= Date.now() + 5000;
    let timeDetails = isNow ? `⚡ **Sent**: Immediately` : `⏰ **First Send**: <t:${startUnix}:F> (<t:${startUnix}:R>)`;
    let repeatDetails = '';
    if (intervalMinutes) {
      if (intervalMinutes >= 1440 && intervalMinutes % 1440 === 0) repeatDetails = `\n⏱️ **Repeat**: Every ${intervalMinutes/1440} day(s)`;
      else if (intervalMinutes >= 60 && intervalMinutes % 60 === 0) repeatDetails = `\n⏱️ **Repeat**: Every ${intervalMinutes/60} hour(s)`;
      else repeatDetails = `\n⏱️ **Repeat**: Every ${intervalMinutes} minute(s)`;
    }

    const confirmMsg = await channel.send({
      content: `✅ **"${session.data.title}" [ID: \`${id}\`] scheduled for <#${targetChannelId}>!**\n${timeDetails}${repeatDetails}`
    });

    // Auto-delete confirmation after 10 seconds
    setTimeout(() => confirmMsg.delete().catch(() => {}), 10000);

  } catch (err) {
    await cleanupSessionMessages(session);
    const errMsg = await channel.send({ content: '⏱️ Announcement creation timed out or was cancelled. Use `/create` to try again.' });
    setTimeout(() => errMsg.delete().catch(() => {}), 8000);
    console.error('Create flow error:', err.message);
  } finally {
    activeSessions.delete(userId);
  }
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
          .setPlaceholder('Select Target Channel for Announcement...')
          .addOptions(channels.map(c => ({ label: `#${c.name}`, value: c.id, description: `Post to #${c.name}` })));

        return interaction.reply({
          content: '📢 **Create Announcement** — Select which channel to post in:',
          components: [new ActionRowBuilder().addComponents(selectMenu)],
          ephemeral: true
        });

      } else if (commandName === 'edit') {
        const id = interaction.options.getString('id');
        const list = await loadAnnouncements(guildId);
        const item = list.find(a => matchId(a.id, id));
        if (!item) return interaction.reply({ content: `❌ ID \`${id}\` not found. Use \`/list\`.`, ephemeral: true });

        await interaction.reply({ content: `✏️ **Edit [ID: ${id}]** — I'll ask you each field step by step. Starting now...`, ephemeral: false });

        const channel = interaction.channel;
        const userId = interaction.user.id;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const dateStr = `${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}${now.getFullYear()}`;
        const session = { messages: [], data: { targetChannelId: item.targetChannelId, editingId: item.id } };
        activeSessions.set(userId, session);

        try {
          let m;
          m = await askStep(channel, userId, `**Edit Step 1/6 — Title** (current: "${item.title}"):`, 'Reply with new title or type "same" to keep');
          session.messages.push(m);
          const titleReply = await awaitReply(channel, userId);
          session.messages.push(titleReply);
          session.data.title = titleReply.content.trim().toLowerCase() === 'same' ? item.title : titleReply.content.trim();

          m = await askStep(channel, userId, `**Edit Step 2/6 — Message Body** (current set):`, 'Reply with new body or type "same" to keep');
          session.messages.push(m);
          const bodyReply = await awaitReply(channel, userId);
          session.messages.push(bodyReply);
          session.data.content = bodyReply.content.trim().toLowerCase() === 'same' ? item.content : bodyReply.content.trim();

          m = await askStep(channel, userId, `**Edit Step 3/6 — Start Time (HH:MM):**`, `Bot time now: ${timeStr} — type "now" to send immediately`);
          session.messages.push(m);
          const timeReply = await awaitReply(channel, userId);
          session.messages.push(timeReply);
          session.data.startTime = timeReply.content.trim();

          m = await askStep(channel, userId, `**Edit Step 4/6 — Start Date (DDMMYYYY):**`, `Today: ${dateStr} — type "today" or "tomorrow"`);
          session.messages.push(m);
          const dateReply = await awaitReply(channel, userId);
          session.messages.push(dateReply);
          session.data.startDate = dateReply.content.trim();

          let currentInterval = 'none';
          if (item.intervalMinutes) {
            if (item.intervalMinutes >= 1440 && item.intervalMinutes % 1440 === 0) currentInterval = `${item.intervalMinutes/1440} days`;
            else if (item.intervalMinutes >= 60 && item.intervalMinutes % 60 === 0) currentInterval = `${item.intervalMinutes/60} hours`;
            else currentInterval = `${item.intervalMinutes}m`;
          }

          m = await askStep(channel, userId, `**Edit Step 5/6 — Repeat Interval** (current: ${currentInterval}):`, 'e.g. "none", "36 hours", "3 days" — or type "same"');
          session.messages.push(m);
          const intervalReply = await awaitReply(channel, userId);
          session.messages.push(intervalReply);
          session.data.interval = intervalReply.content.trim().toLowerCase() === 'same' ? currentInterval : intervalReply.content.trim();

          m = await askStep(channel, userId, `**Edit Step 6/6 — Image Link** (current: ${item.imageUrl ? 'set' : 'none'}):`, 'Paste new Discord Message Link, or type "same" / "skip"');
          session.messages.push(m);
          const imageReply = await awaitReply(channel, userId);
          session.messages.push(imageReply);
          const imgInput = imageReply.content.trim().toLowerCase();
          session.data.imageUrl = imgInput === 'same' ? (item.imageUrl || null) : (imgInput === 'skip' ? null : imageReply.content.trim());

          await cleanupSessionMessages(session);

          const executeAt = parseStartTime(session.data.startTime, session.data.startDate);
          const intervalMinutes = parseInterval(session.data.interval);

          const updated = {
            ...item,
            title: session.data.title,
            content: session.data.content,
            executeAt,
            intervalMinutes,
            imageUrl: session.data.imageUrl,
            isNewCreation: true
          };

          cancelScheduledJob(item.id);
          await saveAnnouncement(updated);
          scheduleItem(client, updated);

          const startUnix = Math.floor(new Date(executeAt).getTime() / 1000);
          const isNow = new Date(executeAt).getTime() <= Date.now() + 5000;
          const timeDetails = isNow ? `⚡ Sent immediately` : `<t:${startUnix}:F> (<t:${startUnix}:R>)`;

          const confirmMsg = await channel.send({ content: `✅ **"${updated.title}" [ID: \`${item.id}\`] updated!** First send: ${timeDetails}` });
          setTimeout(() => confirmMsg.delete().catch(() => {}), 10000);

        } catch (err) {
          await cleanupSessionMessages(session);
          const errMsg = await channel.send({ content: '⏱️ Edit timed out. Use `/edit` to try again.' });
          setTimeout(() => errMsg.delete().catch(() => {}), 8000);
        } finally {
          activeSessions.delete(userId);
        }

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
        await interaction.update({ content: `✅ Channel selected: <#${targetChannelId}>\n📝 I'll guide you step-by-step in this channel. Starting now...`, components: [] });
        await runCreateFlow(interaction, targetChannelId);

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
        return interaction.update({ content: `🎯 **${title}** — Select channel:`, components: [new ActionRowBuilder().addComponents(selectMenu)] });

      } else if (interaction.customId.startsWith('select_preset_channel_')) {
        const targetChannelId = interaction.values[0];
        const presetKey = interaction.customId.replace('select_preset_channel_', '');
        let title = '', content = '', intervalMinutes = 30;
        if (presetKey === 'preset_desert_storm') { title = '🌵 Desert Storm Match Reminder'; content = 'Desert Storm battle is approaching!'; intervalMinutes = 30; }
        else if (presetKey === 'preset_canyon_storm') { title = '⛈️ Canyon Storm Battle Readiness'; content = 'Canyon Storm is starting soon! Ensure rallies are assigned!'; intervalMinutes = 15; }
        else if (presetKey === 'preset_tech_reset') { title = '💡 Tech Donation & Daily Arms Race'; content = 'Daily reset! Donate max diamonds/rss to Alliance Tech!'; intervalMinutes = 1440; }

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
