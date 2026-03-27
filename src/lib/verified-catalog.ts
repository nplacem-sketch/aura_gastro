import verifiedCatalog from '@/data/verified-catalog.json';

type CatalogRecord = Record<string, any>;

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function scoreTopicMatch(topic: string, candidate: string) {
  const source = normalize(topic);
  const target = normalize(candidate);

  if (source === target) return 100;
  if (target.includes(source) || source.includes(target)) return 80;

  const sourceWords = source.split(/\s+/).filter(Boolean);
  const targetWords = new Set(target.split(/\s+/).filter(Boolean));
  return sourceWords.filter((word) => targetWords.has(word)).length * 10;
}

export function getVerifiedCatalog() {
  return verifiedCatalog;
}

export function findVerifiedEntry(type: 'recipe' | 'course' | 'ingredient' | 'technique', topic: string) {
  const pool = verifiedCatalog[`${type}s` as 'recipes'] as CatalogRecord[];
  const ranked = pool
    .map((entry) => ({
      entry,
      score: scoreTopicMatch(topic, String(entry.title ?? entry.name ?? '')),
    }))
    .filter((item) => item.score >= 20)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.entry ?? null;
}
