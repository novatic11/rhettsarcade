const centralParts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
const centralLabel = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short'
});
const zoneLabel = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', timeZoneName: 'short'
});
function partsAt(timestamp) {
  return Object.fromEntries(centralParts.formatToParts(timestamp).map(part => [part.type, part.value]));
}
export function centralInputValue(timestamp) {
  const { year, month, day, hour, minute } = partsAt(timestamp);
  return year + '-' + month + '-' + day + 'T' + hour + ':' + minute;
}
export function centralReleaseLabel(timestamp) {
  const zone = zoneLabel.formatToParts(timestamp).find(part => part.type === 'timeZoneName').value;
  return centralLabel.format(timestamp) + ' ' + zone;
}
export function centralReleaseTimes(input) {
  if (typeof input !== 'string') return [];
  const match = /^(20\d{2})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(input);
  if (!match) return [];
  const [, year, month, day, hour, minute] = match.map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  // The offsets on either side of a Central Time transition cover both readings
  // of a repeated hour. A skipped wall time has no matching instant.
  const candidates = [-86400000, 86400000].map(delta => {
    const sample = wall + delta;
    const p = partsAt(sample);
    const offset = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - sample;
    return wall - offset;
  });
  return [...new Set(candidates)].filter(time => centralInputValue(time) === input).sort((a, b) => a - b);
}
