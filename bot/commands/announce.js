const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ChannelType, 
  EmbedBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const { loadAnnouncements, saveAnnouncement, deleteAnnouncement, matchId } = require('../services/database');
const { scheduleItem, cancelScheduledJob, dispatchAnnouncement } = require('../services/scheduler');

/**
 * Check if the executing member has R4 / R5 / Officer permissions.
 */
function isAllianceLeader(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;
  
  const leaderRoleNames = ['r4', 'r5', 'leader', 'officer', 'alliance leader', 'admin', 'r4/r5'];
  return member.roles.cache.some(role => leaderRoleNames.includes(role.name.toLowerCase()));
}

// 1. Top-level /create command
const createCommand = new SlashCommandBuilder()
  .setName('create')
  .setDescription('Create a new instant or scheduled alliance announcement')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

// 2. Top-level /edit command
const editCommand = new SlashCommandBuilder()
  .setName('edit')
  .setDescription('Edit an existing announcement by ID (e.g. 001)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addStringOption(opt =>
    opt
      .setName('id')
      .setDescription('Announcement ID to edit (e.g. 001 or 1)')
      .setRequired(true)
  );

// 3. Top-level /list command
const listCommand = new SlashCommandBuilder()
  .setName('list')
  .setDescription('List all active scheduled announcements & reminders')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

// 4. Top-level /delete command
const deleteCommand = new SlashCommandBuilder()
  .setName('delete')
  .setDescription('Delete a scheduled announcement by ID')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addStringOption(opt =>
    opt
      .setName('id')
      .setDescription('Announcement ID to cancel (e.g. 001 or 1)')
      .setRequired(true)
  );

// 5. Top-level /preset command
const presetCommand = new SlashCommandBuilder()
  .setName('preset')
  .setDescription('Quickly activate 1-click Alliance Event Presets')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

const allCommandsData = [
  createCommand,
  editCommand,
  listCommand,
  deleteCommand,
  presetCommand
];

module.exports = {
  allCommandsData,
  isAllianceLeader,
};
