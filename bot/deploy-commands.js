const { REST, Routes } = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { allCommandsData } = require('./commands/announce');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env.local');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🔄 Registering slash commands...');

    const commands = allCommandsData.map(cmd => cmd.toJSON());

    if (guildId) {
      const guildIds = guildId.split(',').map(g => g.trim()).filter(Boolean);
      for (const id of guildIds) {
        await rest.put(Routes.applicationGuildCommands(clientId, id), { body: commands });
        console.log(`✅ Registered ${commands.length} slash commands for guild ${id}`);
      }
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log(`✅ Registered ${commands.length} global slash commands`);
    }
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
})();
