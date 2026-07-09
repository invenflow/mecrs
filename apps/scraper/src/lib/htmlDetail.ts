import { request } from 'undici';
import * as cheerio from 'cheerio';

const DEFAULT_HEADERS = {
  'user-agent': 'InvenFlow-Michrazim/0.1 (contact: admin)',
};

export async function fetchHtml(url: string): Promise<string> {
  const retries = 3;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await request(url, { headers: DEFAULT_HEADERS });
    const body = await res.body.text();
    if (res.statusCode >= 200 && res.statusCode < 300) return body;

    const retryable = res.statusCode === 429 || res.statusCode === 502 || res.statusCode === 503 || res.statusCode === 504;
    if (!retryable || attempt === retries) {
      throw new Error(`HTTP ${res.statusCode} for ${url}`);
    }
    await new Promise((r) => setTimeout(r, 400 * attempt));
  }
  // Unreachable
  throw new Error(`HTTP fetch failed for ${url}`);
}

const HEBREW_MONTHS: Record<string, number> = {
  ינואר: 1,
  פברואר: 2,
  מרץ: 3,
  אפריל: 4,
  מאי: 5,
  יוני: 6,
  יולי: 7,
  אוגוסט: 8,
  ספטמבר: 9,
  אוקטובר: 10,
  נובמבר: 11,
  דצמבר: 12,
};

function toIsoDateTime(
  year: number,
  month: number,
  day: number,
  hh?: number,
  mm?: number,
): string | undefined {
  if (year < 1900 || year > 2200) return undefined;
  if (month < 1 || month > 12) return undefined;
  if (day < 1 || day > 31) return undefined;
  const hour = hh ?? 0;
  const minute = mm ?? 0;
  if (hour < 0 || hour > 23) return undefined;
  if (minute < 0 || minute > 59) return undefined;

  // Treat scraped tender timestamps as Israel time by default.
  const dt = new Date(
    `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+02:00`,
  );
  if (Number.isNaN(dt.getTime())) return undefined;
  return dt.toISOString();
}

export function parseHebrewDate(input: string): string | undefined {
  const s = input.replace(/\s+/g, ' ').trim();
  if (!s) return undefined;

  // 01/01/2026 or 1/1/2026
  {
    const m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?\b/);
    if (m) {
      const hh = m[4] ? Number(m[4]) : undefined;
      const mm = m[5] ? Number(m[5]) : undefined;
      const yearRaw = Number(m[3]);
      const year = m[3].length === 2 ? 2000 + yearRaw : yearRaw;
      return toIsoDateTime(year, Number(m[2]), Number(m[1]), hh, mm);
    }
  }

  // 01.01.2026 or 1.1.2026
  {
    const m = s.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?\b/);
    if (m) {
      const hh = m[4] ? Number(m[4]) : undefined;
      const mm = m[5] ? Number(m[5]) : undefined;
      const yearRaw = Number(m[3]);
      const year = m[3].length === 2 ? 2000 + yearRaw : yearRaw;
      return toIsoDateTime(year, Number(m[2]), Number(m[1]), hh, mm);
    }
  }

  // 01 בינואר 2026
  {
    const m = s.match(/\b(\d{1,2})\s+ב?([א-ת]+)\s+(\d{4})\b/);
    if (m) {
      const month = HEBREW_MONTHS[m[2]];
      if (month) return toIsoDateTime(Number(m[3]), month, Number(m[1]));
    }
  }

  return undefined;
}

function firstDateInText(text: string): string | undefined {
  return (
    parseHebrewDate(text) ||
    parseHebrewDate(text.replaceAll('-', '.')) ||
    parseHebrewDate(text.replaceAll('-', '/'))
  );
}

export function extractLabeledDateFromHtml(
  html: string,
  label: string,
): string | undefined {
  const $ = cheerio.load(html);
  const labelNodes = $(`*:contains("${label}")`).toArray();
  for (const node of labelNodes) {
    const $node = $(node);
    const candidateText = [
      $node.text(),
      $node.parent().text(),
      $node.next().text(),
      $node.closest('tr').text(),
    ]
      .filter(Boolean)
      .join(' ');
    const iso = firstDateInText(candidateText);
    if (iso) return iso;
  }
  return undefined;
}

export function guessDatesFromHtml(html: string): {
  publicationDate?: string;
  submissionDeadline?: string;
} {
  const publicationDate =
    extractLabeledDateFromHtml(html, 'תאריך פרסום') ||
    extractLabeledDateFromHtml(html, 'מועד פרסום') ||
    extractLabeledDateFromHtml(html, 'פורסם בתאריך') ||
    extractLabeledDateFromHtml(html, 'תאריך פרסום המכרז');

  const submissionDeadline =
    extractLabeledDateFromHtml(html, 'מועד אחרון להגשה') ||
    extractLabeledDateFromHtml(html, 'מועד אחרון להגש') ||
    extractLabeledDateFromHtml(html, 'תאריך אחרון להגשה');

  return { publicationDate, submissionDeadline };
}

/** Join non-empty parts into a short human-readable description. */
export function joinDescriptionParts(parts: Array<string | undefined | null>, sep = ' · '): string {
  return parts
    .map((p) => (typeof p === 'string' ? p.replace(/\s+/g, ' ').trim() : ''))
    .filter(Boolean)
    .join(sep);
}

export function extractLabeledTextFromHtml(html: string, label: string, maxLen = 240): string | undefined {
  const $ = cheerio.load(html);
  const nodes = $(`*:contains("${label}")`).toArray();
  for (const node of nodes) {
    const t = $(node).parent().text().replace(/\s+/g, ' ').trim();
    if (!t) continue;
    const idx = t.indexOf(label);
    if (idx === -1) continue;
    const after = t.slice(idx + label.length).replace(/^[\s:：\-–]+/, '').trim();
    if (after && after.length <= maxLen) return after;
  }
  return undefined;
}

