import 'dotenv/config';
import { maccabiAdapter } from '../adapters/health/maccabi';
import { telAvivAdapter } from '../adapters/municipalities/telAviv';
import { filterByMinPublicationDate } from '../lib/publicationDate';

async function test(name: string, adapter: ReturnType<typeof maccabiAdapter>) {
  const { tenders } = await adapter.fetch();
  const { kept, skippedNoDate, skippedOld } = filterByMinPublicationDate(tenders);
  console.log(`\n=== ${name} ===`);
  console.log('fetched', tenders.length, 'kept', kept.length, 'skippedNoDate', skippedNoDate, 'skippedOld', skippedOld);
  console.log(
    'sample:',
    kept.slice(0, 3).map((t) => ({
      title: t.title.slice(0, 60),
      publicationDate: t.publicationDate,
      submissionDeadline: t.submissionDeadline,
      sourceUrl: t.sourceUrl.slice(0, 80),
    })),
  );
}

async function main() {
  await test('maccabi', maccabiAdapter());
  await test('tel_aviv', telAvivAdapter());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
