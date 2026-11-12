import { itemEntries, type ItemEntry } from '@/data/item-views';

export interface CertificateJob {
  slug: string;
  name: string;
}

/** Jobs in the order used by the server. */
export const certificateJobs: readonly CertificateJob[] = [
  { slug: 'nether', name: '地獄の探求者' },
  { slug: 'builder', name: '建築家' },
  { slug: 'miner', name: '採掘作業員' },
  { slug: 'terraformer', name: '整地職人' },
  { slug: 'hermit', name: '仙人' },
  { slug: 'angler', name: '海の狩人' },
  { slug: 'end', name: '異界の探求者' },
  { slug: 'farmer', name: '農家' },
  { slug: 'blacksmith', name: '鍛冶師' },
  { slug: 'magician', name: '魔術師' },
];

const FIRST_LEVELS = [30, 50, 70, 80, 90, 100];
const MAX_LEVEL = 200;

/** 30, 50, 70, 80, 90, 100, then every 10 levels up to 200. */
export const certificateLevels: readonly number[] = [
  ...FIRST_LEVELS,
  ...Array.from({ length: (MAX_LEVEL - 100) / 10 }, (_, index) => 110 + index * 10),
];

export interface CertificateRow {
  level: number;
  entry: ItemEntry | null;
}

const entriesBySlug = new Map(itemEntries.map((entry) => [entry.view.source.slug, entry]));

/** Look up every milestone for a job, using `null` for uncollected ones. */
export function certificateRows(job: CertificateJob): CertificateRow[] {
  return certificateLevels.map((level) => ({
    level,
    entry: entriesBySlug.get(`certificate/${job.slug}/${level}`) ?? null,
  }));
}

export function isCertificateSlug(slug: string): boolean {
  return slug.startsWith('certificate/');
}

/** Tooltip-style name minus the shared `資格証明書「...」` wrapper. */
export function certificateTitle(entry: ItemEntry): string {
  const plain = entry.presentation.plainName;
  const withoutPrefix = plain.replace(/^資格証明書/, '').trim();
  const title = withoutPrefix.replace(/^「(.*)」$/, '$1').trim();
  return title || plain;
}

assertValidCertificates();

function assertValidCertificates(): void {
  const jobSlugs = new Set(certificateJobs.map((job) => job.slug));
  const levels = new Set(certificateLevels);
  const failures: string[] = [];

  for (const { view } of itemEntries) {
    const slug = view.source.slug;
    if (!isCertificateSlug(slug)) {
      continue;
    }

    const match = slug.match(/^certificate\/([^/]+)\/(\d+)$/);
    if (!match) {
      failures.push(`${slug}: expected certificate/<job>/<level>.snbt`);
      continue;
    }

    const [, job, rawLevel] = match;
    if (!jobSlugs.has(job)) {
      failures.push(`${slug}: unknown job "${job}"`);
    }
    if (!levels.has(Number(rawLevel))) {
      failures.push(`${slug}: unsupported level "${rawLevel}"`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Invalid certificate data:\n${failures.join('\n')}`);
  }
}
