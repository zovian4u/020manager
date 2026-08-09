function localToUTC(year, month, day, hour, minute, tz) {
  const candidate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const localStr = candidate.toLocaleString('en-CA', { timeZone: tz, hour12: false });
  console.log("localStr", localStr);
  const [datePart, timePart] = localStr.split(', ');
  const [ly, lm, ld] = datePart.split('-').map(Number);
  const [lh, lmin] = timePart.split(':').map(Number);
  const diff = Date.UTC(ly, lm - 1, ld, lh, lmin) - candidate.getTime();
  console.log("diff", diff / 3600000);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - diff);
}

const tz = "Asia/Kolkata";
const result = localToUTC(2026, 8, 9, 16, 54, tz);
console.log("result", result.toISOString());
