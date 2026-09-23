const { loadAnnouncements, saveAnnouncement } = require('./database');

async function getGuildTimezone(guildId) {
  const list = await loadAnnouncements(guildId);
  const tzItem = list.find(item => item.id === `tz_${guildId}`);
  return tzItem ? tzItem.content : 'UTC';
}

async function setGuildTimezone(guildId, timezone) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    return { success: false, error: `Invalid timezone: "${timezone}". Use a valid IANA timezone like Asia/Kolkata, Europe/London, America/New_York` };
  }
  
  const item = {
    id: `tz_${guildId}`,
    guildId,
    title: 'timezone',
    content: timezone,
    targetChannelId: '0',
    type: 'timezone',
    executeAt: new Date().toISOString(),
    intervalMinutes: null,
    rolePing: 'none',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    active: false,
    isNewCreation: false
  };
  await saveAnnouncement(item);
  return { success: true };
}

/**
 * Parse a local time string using the guild's timezone.
 * Converts the entered local time to UTC for storage.
 *
 * Supported formats:
 *   "now"             → immediately (UTC)
 *   "in 2 hours"      → 2h from now (relative, no TZ needed)
 *   "in 30 minutes"   → 30m from now
 *   "in 3 days"       → 3d from now
 *   "tomorrow"        → next day, same local time
 *   "tomorrow 18:30"  → next day at 18:30 local time
 *   "18:30"           → today at 18:30 local time (tomorrow if passed)
 *   "6:30PM"          → today at 18:30 local time
 *   "08/09 6:30PM"    → specific date at 18:30 local time (MM/DD h:mmA)
 *   "18:30 10-08-2026"→ specific date at 18:30 local time
 *   "18:30 10082026"  → same, without separators
 */
async function parseLocalTime(rawInput, guildId) {
  const str = (rawInput || 'now').trim().toLowerCase();
  const tz = await getGuildTimezone(guildId);

  if (str === 'now' || str === '0') return new Date().toISOString();

  // Relative times — no timezone conversion needed
  const minMatch = str.match(/^in\s+(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?$/);
  if (minMatch) return new Date(Date.now() + parseFloat(minMatch[1]) * 60000).toISOString();

  const hourMatch = str.match(/^in\s+(\d+(?:\.\d+)?)\s*h(?:ours?)?$/);
  if (hourMatch) return new Date(Date.now() + parseFloat(hourMatch[1]) * 3600000).toISOString();

  const dayMatch = str.match(/^in\s+(\d+(?:\.\d+)?)\s*d(?:ays?)?$/);
  if (dayMatch) return new Date(Date.now() + parseFloat(dayMatch[1]) * 86400000).toISOString();

  // Helper: convert a local "YYYY-MM-DDTHH:MM" string in the guild's timezone to UTC Date
  function localToUTC(year, month, day, hour, minute) {
    // Use Intl to figure out offset for that specific local datetime in the guild's TZ
    const candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    const localStr = candidate.toLocaleString('en-CA', { timeZone: tz, hour12: false });
    // en-CA gives "YYYY-MM-DD, HH:MM:SS"
    const [datePart, timePart] = localStr.split(', ');
    const [ly, lm, ld] = datePart.split('-').map(Number);
    const [lh, lmin] = timePart.split(':').map(Number);
    const diff = Date.UTC(ly, lm - 1, ld, lh, lmin) - candidate.getTime();
    return new Date(Date.UTC(year, month - 1, day, hour, minute) - diff);
  }

  // Get current local time in guild's timezone
  function getLocalNow() {
    const now = new Date();
    const localStr = now.toLocaleString('en-CA', { timeZone: tz, hour12: false });
    const [datePart, timePart] = localStr.split(', ');
    const [y, m, d] = datePart.split('-').map(Number);
    const [h, min] = timePart.split(':').map(Number);
    return { y, m, d, h, min };
  }

  const ln = getLocalNow();

  // "tomorrow" or "tomorrow HH:MM"
  if (str.startsWith('tomorrow')) {
    const timePart = str.match(/(\d{1,2}):(\d{2})/);
    const h = timePart ? parseInt(timePart[1]) : ln.h;
    const min = timePart ? parseInt(timePart[2]) : ln.min;
    const tmr = localToUTC(ln.y, ln.m, ln.d + 1, h, min);
    return tmr.toISOString();
  }

  // "MM/DD h:mmA" or "MM/DD HH:MM" e.g. "08/09 6:30PM" or "08/09 18:30"
  const mdTimeMatch = str.match(/^(\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/);
  if (mdTimeMatch) {
    let month = parseInt(mdTimeMatch[1]);
    let day = parseInt(mdTimeMatch[2]);
    let h = parseInt(mdTimeMatch[3]);
    let min = parseInt(mdTimeMatch[4]);
    const ampm = mdTimeMatch[5];
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    
    let year = ln.y;
    let result = localToUTC(year, month, day, h, min);
    // If it's more than a day in the past, assume they meant next year
    if (result.getTime() <= Date.now() - 86400000) { 
       year++;
       result = localToUTC(year, month, day, h, min);
    }
    return result.toISOString();
  }

  // "YYYYMMDD HH:MM" e.g. "20260930 18:30"
  const yyyymmddMatch = str.match(/^(\d{4})(\d{2})(\d{2})\s+(\d{1,2}):(\d{2})$/);
  if (yyyymmddMatch) {
    const result = localToUTC(
      parseInt(yyyymmddMatch[1]), parseInt(yyyymmddMatch[2]), parseInt(yyyymmddMatch[3]),
      parseInt(yyyymmddMatch[4]), parseInt(yyyymmddMatch[5])
    );
    return result.toISOString();
  }

  // "HH:MM DD-MM-YYYY" or "HH:MM DDMMYYYY"
  const dtMatch = str.match(/^(\d{1,2}):(\d{2})\s+(\d{2})[-/]?(\d{2})[-/]?(\d{4})$/);
  if (dtMatch) {
    const result = localToUTC(
      parseInt(dtMatch[5]), parseInt(dtMatch[4]), parseInt(dtMatch[3]),
      parseInt(dtMatch[1]), parseInt(dtMatch[2])
    );
    return result.toISOString();
  }

  // "h:mmA" e.g. "6:30PM"
  const timeAmpmMatch = str.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (timeAmpmMatch) {
    let h = parseInt(timeAmpmMatch[1]);
    let min = parseInt(timeAmpmMatch[2]);
    const ampm = timeAmpmMatch[3];
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    
    let result = localToUTC(ln.y, ln.m, ln.d, h, min);
    if (result.getTime() <= Date.now()) {
      result = localToUTC(ln.y, ln.m, ln.d + 1, h, min);
    }
    return result.toISOString();
  }


  // "HH:MM" only → today or tomorrow if already passed
  const timeOnly = str.match(/^(\d{1,2}):(\d{2})$/);
  if (timeOnly) {
    const h = parseInt(timeOnly[1]), min = parseInt(timeOnly[2]);
    let result = localToUTC(ln.y, ln.m, ln.d, h, min);
    if (result.getTime() <= Date.now()) {
      result = localToUTC(ln.y, ln.m, ln.d + 1, h, min);
    }
    return result.toISOString();
  }

  return new Date().toISOString();
}

module.exports = { getGuildTimezone, setGuildTimezone, parseLocalTime };
