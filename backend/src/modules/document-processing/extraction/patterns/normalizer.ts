export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[^\S\n]+/g, ' ')   // collapse multiple spaces (not newlines)
    .replace(/\n{3,}/g, '\n\n')  // max 2 consecutive newlines
    .trim();
}

export function normalizeDate(raw: string): string | null {
  const MONTHS: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    january: 1, february: 2, march: 3, april: 4, june: 6, july: 7,
    august: 8, september: 9, october: 10, november: 11, december: 12,
  };
  const patterns = [
    { re: /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/, order: 'dmy' as const },
    { re: /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/, order: 'ymd' as const },
    {
      re: /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i,
      order: 'dmy_named' as const,
    },
  ];
  for (const { re, order } of patterns) {
    const m = raw.match(re);
    if (!m) continue;
    let d: number, mo: number, y: number;
    if (order === 'dmy')       { d = +m[1]; mo = +m[2];                              y = +m[3]; }
    else if (order === 'ymd')  { y = +m[1]; mo = +m[2];                              d = +m[3]; }
    else                       { d = +m[1]; mo = MONTHS[m[2].toLowerCase()] ?? 0;    y = +m[3]; }
    if (!d || !mo || !y) continue;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}
