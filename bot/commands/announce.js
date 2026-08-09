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
    .setName('preset')
    .setDescription('Quick-deploy a preset Alliance Event announcement'),
];


module.exports = { allCommandsData, isAllianceLeader };
