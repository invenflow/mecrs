import { request } from 'undici';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import type { TenderAdapter } from './base';
import type { NormalizedTender } from '../types/tender';
import {
  extractLabeledDateFromHtml,
  extractLabeledTextFromHtml,
  fetchHtml,
  guessDatesFromHtml,
  joinDescriptionParts,
} from '../lib/htmlDetail';

function absoluteUrl(href: string) {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('/')) return `https://bids.dekel.co.il${href}`;
  return `https://bids.dekel.co.il/${href}`;
}

export function dekelAdapter(): TenderAdapter {
  return {
    source: 'dekel',
    async fetch() {
      const baseUrls = (process.env.DEKEL_BASE_URLS ?? 'https://bids.dekel.co.il')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const tenders: NormalizedTender[] = [];
      const limit = pLimit(5);

      for (const baseUrl of baseUrls) {
        const res = await request(baseUrl, {
          headers: { 'user-agent': 'InvenFlow-Michrazim/0.1 (contact: admin)' },
        });
        if (res.statusCode < 200 || res.statusCode >= 300) {
          throw new Error(`Dekel HTTP ${res.statusCode} for ${baseUrl}`);
        }
        const html = await res.body.text();
        const $ = cheerio.load(html);

        const links = $('a[href*="Item.aspx"], a[href*="item.aspx"]')
          .map((_i, el) => String($(el).attr('href') ?? ''))
          .get()
          .filter(Boolean);

        const uniq = Array.from(new Set(links)).slice(0, 200);
        const items = await Promise.all(
          uniq.map((href) =>
            limit(async () => {
              const url = absoluteUrl(href);
              const $link = $('a[href="' + href.replace(/"/g, '\\"') + '"]').first();
              const linkText = $link.text().trim();
              const card = $link.closest('article, .card, .tender, li, .row, section, div');
              const heading =
                card.find('h1, h2, h3, h4, .title, .tender-title').first().text().replace(/\s+/g, ' ').trim() ||
                $link.closest('h1, h2, h3, h4').text().replace(/\s+/g, ' ').trim();
              const listTitle =
                heading && !/^צפייה\s+(במכרז|בקול\s+קורא)/i.test(heading) ? heading : undefined;
              const domain =
                extractLabeledTextFromListCard(card, 'תחום') ||
                card
                  .text()
                  .match(/תחום\s*:\s*([^\n]+)/)?.[1]
                  ?.trim();

              const detailHtml = await fetchHtml(url);
              const baseDates = guessDatesFromHtml(detailHtml);

              // Dekel pages often include tender timeline labels.
              const submissionStart =
                extractLabeledDateFromHtml(detailHtml, 'הגשת הצעות החל מ') ||
                extractLabeledDateFromHtml(detailHtml, 'הגשת הצעה החל מ');

              const publicationDate = baseDates.publicationDate ?? submissionStart;
              const submissionDeadline = baseDates.submissionDeadline;

              const publisherText =
                extractLabeledTextFromHtml(detailHtml, 'מפרסם מכרז') ||
                extractLabeledTextFromHtml(detailHtml, 'מפרסם המכרז') ||
                extractLabeledText(detailHtml, 'מפרסם מכרז') ||
                extractLabeledText(detailHtml, 'מפרסם המכרז') ||
                'דקל';

              const detailTitle =
                cheerio
                  .load(detailHtml)('h1, h2, .tender-title, .page-title')
                  .first()
                  .text()
                  .replace(/\s+/g, ' ')
                  .trim() || undefined;
              const subject =
                extractLabeledTextFromHtml(detailHtml, 'תחום') ||
                extractLabeledTextFromHtml(detailHtml, 'נושא') ||
                domain;

              const titleCandidate =
                [detailTitle, listTitle, linkText].find(
                  (t) => t && t.length > 3 && !/^צפייה\s+(במכרז|בקול\s+קורא)/i.test(t),
                ) || 'מכרז (דקל)';

              const tender: NormalizedTender = {
                externalId: url,
                source: 'dekel',
                sourceUrl: url,
                title: titleCandidate,
                description: joinDescriptionParts([
                  subject ? `תחום: ${subject}` : undefined,
                  publisherText !== 'דקל' ? `מפרסם: ${publisherText}` : undefined,
                ]),
                publisher: publisherText,
                tenderType: 'municipal',
                status: 'open',
                publicationDate,
                submissionDeadline,
                rawData: { href, baseUrl, listTitle, linkText },
              };

              return tender;
            }),
          ),
        );

        tenders.push(...items);
      }

      return { tenders };
    },
  };
}

function extractLabeledText(html: string, label: string): string | undefined {
  const $ = cheerio.load(html);
  const nodes = $(`*:contains("${label}")`).toArray();
  for (const node of nodes) {
    const t = $(node).parent().text().replace(/\s+/g, ' ').trim();
    if (!t) continue;
    const idx = t.indexOf(label);
    if (idx === -1) continue;
    const after = t.slice(idx + label.length).replace(/^[\s:：\-–]+/, '').trim();
    if (after && after.length <= 120) return after;
  }
  return undefined;
}

function extractLabeledTextFromListCard(card: { text: () => string }, label: string): string | undefined {
  const text = card.text().replace(/\s+/g, ' ').trim();
  const idx = text.indexOf(label);
  if (idx === -1) return undefined;
  const after = text.slice(idx + label.length).replace(/^[\s:：\-–]+/, '').trim();
  if (!after) return undefined;
  return after.split(/\s{2,}|·|\|/)[0]?.trim().slice(0, 80) || undefined;
}

