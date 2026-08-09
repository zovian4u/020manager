const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const TZ_FILE = path.join(DATA_DIR, 'timezones.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadTimezones() {
  if (!fs.existsSync(TZ_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(TZ_FILE, 'utf-8')); } catch { return {}; }
}

function saveTimezones(data) {
  fs.writeFileSync(TZ_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getGuildTimezone(guildId) {
  const data = loadTimezones();
  return data[guildId] || 'UTC';
}

function setGuildTimezone(guildId, timezone) {
  // Validate timezone
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    return { success: false, error: `Invalid timezone: "${timezone}". Use a valid IANA timezone like Asia/Kolkata, Europe/London, America/New_York` };
  }
  const data = loadTimezones();
  data[guildId] = timezone;
  saveTimezones(data);
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
 *   "18:30 10-08-2026"→ specific date at 18:30 local time
 *   "18:30 10082026"  → same, without separators
 */
function parseLocalTime(rawInput, guildId) {
  const str = (rawInput || 'now').trim().toLowerCase();
  const tz = getGuildTimezone(guildId);

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

  // "HH:MM DD-MM-YYYY" or "HH:MM DDMMYYYY"
  const dtMatch = str.match(/^(\d{1,2}):(\d{2})\s+(\d{2})[-/]?(\d{2})[-/]?(\d{4})$/);
  if (dtMatch) {
    const result = localToUTC(
      parseInt(dtMatch[5]), parseInt(dtMatch[4]), parseInt(dtMatch[3]),
      parseInt(dtMatch[1]), parseInt(dtMatch[2])
    );
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
