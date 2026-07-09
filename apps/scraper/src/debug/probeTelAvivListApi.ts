import 'dotenv/config';
import { fetchHtml } from '../lib/htmlDetail';
import { request } from 'undici';

const LIST = '63229773-ffac-4d47-9bb9-fde6614cd663';
const VIEW = '699c03e2-e570-404c-9cd9-bb041e986d41';
const WEB = 'c572b9ed-c977-4a07-a430-6445afe1daba';
const BASE = 'https://www.tel-aviv.gov.il/AuctionAndCareers';

async function tryGet(url: string, headers: Record<string, string> = {}) {
  const res = await request(url, {
    headers: { 'user-agent': 'InvenFlow-Michrazim/0.1', accept: 'application/json', ...headers },
    maxRedirections: 5,
  });
  const body = await res.body.text();
  console.log('\n', url);
  console.log('status', res.statusCode, 'len', body.length);
  console.log(body.slice(0, 2500));
  return body;
}

async function main() {
  const html = await fetchHtml(`${BASE}/Pages/Service.aspx`);
  const hints = [
    ...new Set(
      [...html.matchAll(/["']([^"']*(?:GetList|ListData|RenderList|inplview|Tlv|Digitel|tab\.|ashx|asmx)[^"']*)["']/gi)].map(
        (m) => m[1],
      ),
    ),
  ];
  console.log('endpoint hints:', hints.filter((h) => h.length < 200).slice(0, 40));

  await tryGet(`${BASE}/_api/web/lists(guid'${LIST}')/items?$top=10&$orderby=Modified desc`);
  await tryGet(`${BASE}/_api/web/lists(guid'${LIST}')/items?$top=10&$orderby=Modified desc`, {
    accept: 'application/json;odata=verbose',
  });

  // RenderListDataAsStream with form digest
  const $ = await import('cheerio');
  const ch = $.load(html);
  const digest = String(ch('#__REQUESTDIGEST')?.attr('value') ?? '');
  const spDigest = html.match(/formDigestValue":"([^"]+)"/)?.[1];
  console.log('digest found:', Boolean(digest || spDigest));

  const streamUrl = `${BASE}/_api/web/lists(guid'${LIST}')/RenderListDataAsStream`;
  const res = await request(streamUrl, {
    method: 'POST',
    headers: {
      accept: 'application/json;odata=verbose',
      'content-type': 'application/json;odata=verbose',
      'user-agent': 'InvenFlow-Michrazim/0.1',
      'X-RequestDigest': spDigest ?? digest,
    },
    body: JSON.stringify({
      parameters: {
        ViewXml: `<View Scope='RecursiveAll'><ViewFields><FieldRef Name='Title'/><FieldRef Name='Modified'/><FieldRef Name='FileRef'/></ViewFields><Query><OrderBy><FieldRef Name='Modified' Ascending='FALSE'/></OrderBy></Query><RowLimit>20</RowLimit></View>`,
        RenderOptions: 2,
      },
    }),
    maxRedirections: 5,
  });
  const streamBody = await res.body.text();
  console.log('\nRenderListDataAsStream POST', res.statusCode, streamBody.slice(0, 4000));

  // inplview.aspx
  await tryGet(
    `${BASE}/_layouts/15/inplview.aspx?List=${encodeURIComponent(`{${LIST}}`)}&View=${encodeURIComponent(`{${VIEW}}`)}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
