const { REST, Routes } = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { allCommandsData } = require('./commands/announce');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const rawGuildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('❌ Error: Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env.local file.');
  process.exit(1);
}

const commands = allCommandsData.map(cmd => cmd.toJSON());
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    // Parse guild IDs (comma-separated or single)
    const guildIds = rawGuildId 
      ? rawGuildId.split(',').map(id => id.trim()).filter(Boolean)
      : [];

    console.log('🔄 Wiping old global commands to prevent duplicates...');
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: [] }
    );

    if (guildIds.length > 0) {
      for (const gid of guildIds) {
        console.log(`🔄 Registering ${commands.length} Slash Commands for Server ID: ${gid}...`);
        await rest.put(
          Routes.applicationGuildCommands(clientId, gid),
          { body: commands }
        );
        console.log(`✅ Successfully registered slash commands for Server ID: ${gid}`);
      }
    } else {
      console.log(`🔄 Registering ${commands.length} Slash Commands globally...`);
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log(`✅ Successfully registered slash commands globally.`);
    }

  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
})();
