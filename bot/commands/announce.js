const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

/**
 * Check if a member has Alliance Leader permissions (R4/R5/Admin)
 */
function isAllianceLeader(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;

  const leaderRoles = ['r4', 'r5', 'leader', 'officer', 'alliance leader', 'admin', 'co-leader', 'mod'];
  return member.roles.cache.some(role =>
    leaderRoles.some(lr => role.name.toLowerCase().includes(lr))
  );
}

const allCommandsData = [
  new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create a scheduled alliance announcement')
    .addChannelOption(opt => opt
      .setName('channel')
      .setDescription('Channel to post the announcement in')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('title')
      .setDescription('Announcement title')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('body')
      .setDescription('Full announcement message body')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('time')
      .setDescription('When to send in your local timezone (e.g. 08/09 6:30PM, in 2 hours, now)')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('interval')
      .setDescription('Repeat interval (e.g. 1m, 36 hours, 3 days)')
      .setRequired(false))
    .addStringOption(opt => opt
      .setName('image')
      .setDescription('Image: right-click an image message → Copy Message Link → paste here')
      .setRequired(false)),

  new SlashCommandBuilder()
    .setName('list')
    .setDescription('List, edit, and delete scheduled announcements for this server'),

  new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Delete a scheduled announcement by ID')
    .addStringOption(opt => opt
      .setName('id')
      .setDescription('Announcement ID to delete (e.g. 001)')
      .setRequired(true)),

  new SlashCommandBuilder()
    .setName('timezone')
    .setDescription('Set or view the server timezone for announcement times')
    .addSubcommand(sub => sub
      .setName('set')
      .setDescription('Set the server timezone (e.g. Asia/Kolkata, Europe/London, America/New_York)')
      .addStringOption(opt => opt
        .setName('zone')
        .setDescription('Timezone name (e.g. Asia/Kolkata)')
        .setRequired(true)))
    .addSubcommand(sub => sub
      .setName('show')
      .setDescription('Show the current server timezone setting')),

  new SlashCommandBuilder()
    .setName('preset')
    .setDescription('Quick-deploy a preset Alliance Event announcement'),
];


module.exports = { allCommandsData, isAllianceLeader };
