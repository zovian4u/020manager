const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const DATA_DIR = path.join(__dirname, '../data');
const FILE_PATH = path.join(DATA_DIR, 'announcements.json');

// Ensure data directory exists
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
 * Load all scheduled announcements / reminders.
 */
async function loadAnnouncements() {
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
      const { data, error } = await supabase.from('alliance_announcements').select('*');
      if (!error && data && data.length > 0) {
        const mergedMap = new Map();
        list.forEach(item => mergedMap.set(item.id, item));
        data.forEach(item => mergedMap.set(item.id, item));
        list = Array.from(mergedMap.values());
        saveAnnouncementsLocally(list);
      }
    } catch (err) {
      console.warn('Supabase fetch notice:', err.message);
    }
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
      await supabase.from('alliance_announcements').upsert(announcements, { onConflict: 'id' });
    } catch (err) {
      console.warn('Supabase save notice (will retain local file):', err.message);
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
 * Delete announcement by ID (matches "001", "1", etc.)
 */
async function deleteAnnouncement(id) {
  let list = await loadAnnouncements();
  const initialCount = list.length;
  
  // Find matching item to get its exact stored ID
  const itemToDelete = list.find(a => matchId(a.id, id));
  
  list = list.filter(a => !matchId(a.id, id));
  saveAnnouncementsLocally(list);

  if (supabase && itemToDelete) {
    try {
      await supabase.from('alliance_announcements').delete().eq('id', itemToDelete.id);
    } catch (err) {
      console.warn('Supabase delete notice:', err.message);
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
