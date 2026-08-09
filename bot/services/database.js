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
 * Load scheduled announcements / reminders. Filter by guildId if provided.
 */
async function loadAnnouncements(guildId = null) {
  let list = [];
  
  if (fs.existsSync(FILE_PATH)) {
    try {
      const data = fs.readFileSync(FILE_PATH, 'utf-8');
      list = JSON.parse(data);
    } catch (e) {
      console.error('Error reading local announcements file:', e.message);
    }
  }

  if (supabase) {
    try {
      let query = supabase.from('alliance_announcements').select('*');
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
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

        const mergedMap = new Map();
        list.forEach(item => mergedMap.set(String(item.id), item));
        mappedData.forEach(item => mergedMap.set(String(item.id), item));
        list = Array.from(mergedMap.values());
        saveAnnouncementsLocally(list);
      }
    } catch (err) {
      console.warn('Supabase fetch notice:', err.message);
    }
  }

  if (guildId) {
    return list.filter(item => item.guildId === guildId || !item.guildId);
  }

  return list;
}

/**
 * Save array of announcements to local storage and Supabase if configured.
 */
async function saveAnnouncements(announcements) {
  saveAnnouncementsLocally(announcements);

  if (supabase) {
    try {
      const rows = announcements.map(item => ({
        id: String(item.id),
        guild_id: item.guildId,
        title: item.title,
        content: item.content,
        target_channel_id: item.targetChannelId,
        type: item.type,
        execute_at: item.executeAt,
        interval_minutes: item.intervalMinutes,
        cron_expression: item.cronExpression,
        role_ping: item.rolePing,
        image_url: item.imageUrl,
        created_by: item.createdBy,
        created_at: item.createdAt,
        active: item.active !== false
      }));

      await supabase.from('alliance_announcements').upsert(rows, { onConflict: 'id' });
    } catch (err) {
      console.warn('Supabase save notice (retaining local storage):', err.message);
    }
  }
}

/**
 * Save locally to JSON file.
 */
function saveAnnouncementsLocally(announcements) {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(announcements, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write local announcements file:', err.message);
  }
}

/**
 * Add or update a single announcement.
 */
async function saveAnnouncement(announcement) {
  const list = await loadAnnouncements();
  const index = list.findIndex(a => matchId(a.id, announcement.id));
  if (index >= 0) {
    list[index] = announcement;
  } else {
    list.push(announcement);
  }
  await saveAnnouncements(list);
}

/**
 * Delete announcement by ID (matches "002", "2", "ann_002" flexibly across both Local and Supabase)
 */
async function deleteAnnouncement(id, guildId = null) {
  let list = await loadAnnouncements();
  const initialCount = list.length;
  
  const itemsToDelete = list.filter(a => matchId(a.id, id) && (!guildId || a.guildId === guildId || !a.guildId));
  
  if (itemsToDelete.length > 0) {
    // Remove from local list
    list = list.filter(a => !matchId(a.id, id));
    saveAnnouncementsLocally(list);

    if (supabase) {
      try {
        const rawId = String(id).trim();
        const numId = String(parseInt(rawId.replace(/\D/g, ''), 10));
        const padId = !isNaN(numId) ? numId.padStart(3, '0') : rawId;
        
        const deleteIds = Array.from(new Set([rawId, numId, padId, ...itemsToDelete.map(i => String(i.id))]));

        await supabase.from('alliance_announcements').delete().in('id', deleteIds);
      } catch (err) {
        console.warn('Supabase delete error:', err.message);
      }
    }
  }

  return { success: list.length < initialCount, list };
}

module.exports = {
  loadAnnouncements,
  saveAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  matchId,
};
