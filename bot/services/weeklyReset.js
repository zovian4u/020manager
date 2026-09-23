const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const { getGuildTimezone } = require('./timezone');

// ─── Supabase client (same pattern as database.js) ───────────────────────────
let supabase = null;
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.warn('⚠️  weeklyReset: Supabase init warning:', err.message);
  }
}

// Channel to post the weekly reset announcement into
const ANNOUNCE_CHANNEL_ID = '1294462126634696789';

// The guild ID used to look up the saved timezone
const GUILD_ID = process.env.DISCORD_GUILD_ID;

// Reference to the active cron task so we can stop it cleanly if needed
let resetTask = null;

// ─── Core reset logic (exported so it can be triggered manually too) ─────────
async function runWeeklyReset(client) {
  console.log('🔄 [WeeklyReset] Starting Sunday reset...');

  const results = { ds: false, cs: false, errors: [] };

  if (!supabase) {
    const msg = 'Supabase not available — weekly reset skipped.';
    console.error('❌ [WeeklyReset]', msg);
    results.errors.push(msg);
    return results;
  }

  // ── 1. Clear Desert Storm signups ─────────────────────────────────────────
  try {
    const { error: dsError } = await supabase
      .from('members')
      .update({
        ds_choice:       null,
        ds_team:         null,
        ds_signup_time:  null,
        team_assignment: null,
      })
      .not('user_id', 'is', null);

    if (dsError) {
      console.error('❌ [WeeklyReset] DS clear error:', dsError.message);
      results.errors.push(`DS: ${dsError.message}`);
    } else {
      console.log('✅ [WeeklyReset] Desert Storm signups cleared.');
      results.ds = true;
    }
  } catch (err) {
    console.error('❌ [WeeklyReset] DS exception:', err.message);
    results.errors.push(`DS exception: ${err.message}`);
  }

  // ── 2. Clear Canyon Storm signups ─────────────────────────────────────────
  try {
    const { error: csError } = await supabase
      .from('members')
      .update({
        cs_choice:          null,
        cs_team:            null,
        cs_team_assignment: null,
        cs_signup_time:     null,
      })
      .not('user_id', 'is', null);

    if (csError) {
      console.error('❌ [WeeklyReset] CS clear error:', csError.message);
      results.errors.push(`CS: ${csError.message}`);
    } else {
      console.log('✅ [WeeklyReset] Canyon Storm signups cleared.');
      results.cs = true;
    }
  } catch (err) {
    console.error('❌ [WeeklyReset] CS exception:', err.message);
    results.errors.push(`CS exception: ${err.message}`);
  }

  // ── 3. Log to audit_logs ───────────────────────────────────────────────────
  try {
    await supabase.from('audit_logs').insert({
      user_id:  null,
      username: 'BOT — Weekly Auto Reset',
      action:   'WEEKLY_AUTO_CLEAR',
      details:  {
        context: 'Weekly Sunday Reset (bot)',
        ds_cleared: results.ds,
        cs_cleared: results.cs,
        errors: results.errors,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn('⚠️  [WeeklyReset] audit_logs insert skipped:', err.message);
  }

  // ── 4. Post Discord announcement ───────────────────────────────────────────
  try {
    const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);

    const dsStatus = results.ds ? '✅ Cleared' : '❌ Failed';
    const csStatus = results.cs ? '✅ Cleared' : '❌ Failed';

    const embed = new EmbedBuilder()
      .setTitle('🔄 Weekly Registration Reset — Complete')
      .setDescription(
        '> All member signup data has been automatically cleared for the new week.\n' +
        '> Registration windows remain open — members can sign up again now.'
      )
      .addFields(
        { name: '🌵 Desert Storm Signups', value: dsStatus, inline: true },
        { name: '⛈️ Canyon Storm Signups', value: csStatus, inline: true },
        { name: '\u200b',                  value: '\u200b',  inline: true },
        {
          name: '📋 What was cleared',
          value:
            '• Choice (YES / MAYBE / NO)\n' +
            '• Team preference (A / B / Both)\n' +
            '• Sign-up timestamp\n' +
            '• Team assignment',
          inline: false,
        }
      )
      .setColor(results.errors.length === 0 ? 0x22c55e : 0xf59e0b)
      .setTimestamp()
      .setFooter({ text: '020 Alliance Bot • Auto-scheduled every Sunday 00:00' });

    if (results.errors.length > 0) {
      embed.addFields({
        name: '⚠️ Errors',
        value: results.errors.join('\n'),
        inline: false,
      });
    }

    await channel.send({ content: '@everyone', embeds: [embed] });
    console.log('📢 [WeeklyReset] Announcement posted to channel', ANNOUNCE_CHANNEL_ID);
  } catch (err) {
    console.error('❌ [WeeklyReset] Failed to post Discord announcement:', err.message);
  }

  return results;
}

// ─── Schedule the weekly cron (called once on bot ready) ─────────────────────
async function initWeeklyReset(client) {
  if (!GUILD_ID) {
    console.warn('⚠️  [WeeklyReset] DISCORD_GUILD_ID not set — cannot determine timezone. Skipping weekly reset scheduler.');
    return;
  }

  // Fetch the timezone the R4/R5 set via /timezone command
  const timezone = await getGuildTimezone(GUILD_ID);
  console.log(`⏰ [WeeklyReset] Scheduling Sunday 00:00 reset using timezone: ${timezone}`);

  // node-cron v4 accepts { timezone } natively
  // "0 0 * * 0" = at 00:00 every Sunday
  resetTask = cron.schedule('0 0 * * 0', async () => {
    console.log(`⏰ [WeeklyReset] Cron fired — Sunday 00:00 (${timezone})`);
    await runWeeklyReset(client);
  }, {
    timezone,
    scheduled: true,
  });

  console.log(`✅ [WeeklyReset] Weekly reset cron active — fires every Sunday at 00:00 ${timezone}`);
}

// Stop the cron cleanly (e.g. on process exit)
function stopWeeklyReset() {
  if (resetTask) {
    resetTask.stop();
    console.log('🛑 [WeeklyReset] Cron stopped.');
  }
}

module.exports = { initWeeklyReset, stopWeeklyReset, runWeeklyReset };
