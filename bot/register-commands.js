const { REST, Routes } = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { allCommandsData } = require('./commands/announce');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('❌ Error: Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env.local file.');
  process.exit(1);
}

const commands = allCommandsData.map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    if (guildId) {
      console.log('🔄 Wiping old global commands to prevent duplicate entries...');
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: [] }
      );
      console.log('✅ Global duplicate commands cleared!');

      console.log(`🔄 Registering ${commands.length} Server Slash Commands for Server ID: ${guildId}...`);
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`✅ Successfully registered ${commands.length} slash commands for Server ID: ${guildId}`);
    } else {
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log(`✅ Successfully registered ${commands.length} slash commands globally.`);
    }

  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
})();
