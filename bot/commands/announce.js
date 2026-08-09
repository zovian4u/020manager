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
      .setDescription('Announcement title (e.g. Desert Storm / Marshall Event)')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('body')
      .setDescription('Full announcement message body')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('time')
      .setDescription('Start time in 24h format or "now" (e.g. 18:00)')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('date')
      .setDescription('Start date DDMMYYYY, "today", or "tomorrow" (e.g. 10082026)')
      .setRequired(false))
    .addStringOption(opt => opt
      .setName('interval')
      .setDescription('Repeat interval: "none", "36 hours", "3 days", "45 minutes"')
      .setRequired(false))
    .addStringOption(opt => opt
      .setName('image')
      .setDescription('Image: right-click an image message → Copy Message Link → paste here')
      .setRequired(false)),

  new SlashCommandBuilder()
    .setName('edit')
    .setDescription('Edit an existing scheduled announcement')
    .addStringOption(opt => opt
      .setName('id')
      .setDescription('Announcement ID to edit (e.g. 001)')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('title')
      .setDescription('New title (leave empty to keep current)')
      .setRequired(false))
    .addStringOption(opt => opt
      .setName('body')
      .setDescription('New message body (leave empty to keep current)')
      .setRequired(false))
    .addStringOption(opt => opt
      .setName('time')
      .setDescription('New start time in 24h format or "now" (e.g. 18:00)')
      .setRequired(false))
    .addStringOption(opt => opt
      .setName('date')
      .setDescription('New start date DDMMYYYY, "today", or "tomorrow"')
      .setRequired(false))
    .addStringOption(opt => opt
      .setName('interval')
      .setDescription('New repeat interval: "none", "36 hours", "3 days"')
      .setRequired(false))
    .addStringOption(opt => opt
      .setName('image')
      .setDescription('New image: Copy Message Link, or "none" to remove')
      .setRequired(false)),

  new SlashCommandBuilder()
    .setName('list')
    .setDescription('List all active scheduled announcements for this server'),

  new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Delete a scheduled announcement by ID')
    .addStringOption(opt => opt
      .setName('id')
      .setDescription('Announcement ID to delete (e.g. 001)')
      .setRequired(true)),

  new SlashCommandBuilder()
    .setName('preset')
    .setDescription('Quick-deploy a preset Alliance Event announcement'),
];

module.exports = { allCommandsData, isAllianceLeader };
