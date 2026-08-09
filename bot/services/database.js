const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const DATA_DIR = path.join(__dirname, '../data');
const FILE_PATH = path.join(DATA_DIR, 'announcements.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize Supabase if keys exist
let supabase = null;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Connected to Supabase for Alliance Bot synchronization.');
  } catch (err) {
    console.warn('⚠️ Supabase connection warning, falling back to local file storage:', err.message);
  }
}

/**
 * Smart ID matcher: matches "001", "1", "ann_001" flexibly
 */
function matchId(id1, id2) {
  if (!id1 || !id2) return false;
  const s1 = String(id1).trim().toLowerCase();
  const s2 = String(id2).trim().toLowerCase();
  if (s1 === s2) return true;

  const n1 = parseInt(s1.replace(/\D/g, ''), 10);
  const n2 = parseInt(s2.replace(/\D/g, ''), 10);
  return !isNaN(n1) && !isNaN(n2) && n1 === n2;
}

/**
 * Read local JSON file only (no Supabase).
 */
function readLocalFile() {
  if (!fs.existsSync(FILE_PATH)) return [];
  try {
    const data = fs.readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading local file:', e.message);
    return [];
  }
}

/**
 * Write list to local JSON file.
 */
function writeLocalFile(list) {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write local announcements file:', err.message);
  }
}

/**
 * Load scheduled announcements. Always reads Supabase as source of truth.
 * Filter by guildId if provided.
 */
async function loadAnnouncements(guildId = null) {
  let list = readLocalFile();

  if (supabase) {
    try {
      const { data, error } = await supabase.from('alliance_announcements').select('*');
      if (!error && data) {
        const mappedData = data.map(row => ({
          id: row.id,
          guildId: row.guild_id,
          title: row.title,
          content: row.content,
          targetChannelId: row.target_channel_id,
          type: row.type,
          executeAt: row.execute_at,
          intervalMinutes: row.interval_minutes,
          cronExpression: row.cron_expression,
          rolePing: row.role_ping,
          imageUrl: row.image_url,
          createdBy: row.created_by,
          createdAt: row.created_at,
          active: row.active !== false
        }));
        list = mappedData;
        writeLocalFile(list); // Sync local file to Supabase state
      }
    } catch (err) {
      console.warn('Supabase fetch notice (using local):', err.message);
    }
  }

  if (guildId) {
    return list.filter(item => item.guildId === guildId || !item.guildId);
  }

  return list;
}

/**
 * Save array of announcements to Supabase and local file.
 */
async function saveAnnouncements(announcements) {
  writeLocalFile(announcements);

  if (supabase) {
    try {
      const rows = announcements.map(item => ({
        id: String(item.id),
        guild_id: item.guildId || null,
        title: item.title,
        content: item.content,
        target_channel_id: item.targetChannelId,
        type: item.type,
        execute_at: item.executeAt,
        interval_minutes: item.intervalMinutes,
        cron_expression: item.cronExpression || null,
        role_ping: item.rolePing || 'everyone',
        image_url: item.imageUrl || null,
        created_by: item.createdBy || null,
        created_at: item.createdAt || new Date().toISOString(),
        active: item.active !== false
      }));
      await supabase.from('alliance_announcements').upsert(rows, { onConflict: 'id' });
    } catch (err) {
      console.warn('Supabase save notice (retaining local storage):', err.message);
    }
  }
}

/**
 * Add or update a single announcement in Supabase and local file.
 */
async function saveAnnouncement(announcement) {
  // Save to Supabase directly
  if (supabase) {
    try {
      const row = {
        id: String(announcement.id),
        guild_id: announcement.guildId || null,
        title: announcement.title,
        content: announcement.content,
        target_channel_id: announcement.targetChannelId,
        type: announcement.type,
        execute_at: announcement.executeAt,
        interval_minutes: announcement.intervalMinutes,
        cron_expression: announcement.cronExpression || null,
        role_ping: announcement.rolePing || 'everyone',
        image_url: announcement.imageUrl || null,
        created_by: announcement.createdBy || null,
        created_at: announcement.createdAt || new Date().toISOString(),
        active: announcement.active !== false
      };
      await supabase.from('alliance_announcements').upsert([row], { onConflict: 'id' });
    } catch (err) {
      console.warn('Supabase upsert error:', err.message);
    }
  }

  // Also update local file
  const list = readLocalFile();
  const index = list.findIndex(a => matchId(a.id, announcement.id));
  if (index >= 0) {
    list[index] = announcement;
  } else {
    list.push(announcement);
  }
  writeLocalFile(list);
}

/**
 * Delete announcement by ID — deletes from BOTH Supabase and local file.
 */
async function deleteAnnouncement(id, guildId = null) {
  console.log(`🗑️ Attempting to delete announcement ID: ${id}`);

  // Delete from Supabase first (source of truth)
  let supabaseDeleted = false;
  if (supabase) {
    try {
      // Fetch all rows from Supabase matching the ID flexibly
      const { data: allRows, error: fetchErr } = await supabase
        .from('alliance_announcements')
        .select('id');

      if (!fetchErr && allRows) {
        const matchingIds = allRows
          .filter(row => matchId(row.id, id))
          .map(row => row.id);

        if (matchingIds.length > 0) {
          console.log(`🗑️ Deleting from Supabase IDs: ${matchingIds.join(', ')}`);
          const { error: delErr } = await supabase
            .from('alliance_announcements')
            .delete()
            .in('id', matchingIds);

          if (delErr) {
            console.error('Supabase delete error:', delErr.message);
          } else {
            supabaseDeleted = true;
            console.log(`✅ Deleted from Supabase: ${matchingIds.join(', ')}`);
          }
        }
      }
    } catch (err) {
      console.error('Supabase delete exception:', err.message);
    }
  }

  // Delete from local file
  let list = readLocalFile();
  const initialCount = list.length;
  list = list.filter(a => !matchId(a.id, id));
  writeLocalFile(list);

  const localDeleted = list.length < initialCount;
  const success = supabaseDeleted || localDeleted;

  console.log(`🗑️ Delete result — Supabase: ${supabaseDeleted}, Local: ${localDeleted}`);
  return { success, list };
}

module.exports = {
  loadAnnouncements,
  saveAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  matchId,
};
