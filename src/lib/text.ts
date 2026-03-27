const MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [
  ['Ã¡', 'á'],
  ['Ã©', 'é'],
  ['Ã­', 'í'],
  ['Ã³', 'ó'],
  ['Ãº', 'ú'],
  ['Ã', 'Á'],
  ['Ã‰', 'É'],
  ['Ã', 'Í'],
  ['Ã“', 'Ó'],
  ['Ãš', 'Ú'],
  ['Ã±', 'ñ'],
  ['Ã‘', 'Ñ'],
  ['Ã¼', 'ü'],
  ['Ãœ', 'Ü'],
  ['Â¿', '¿'],
  ['Â¡', '¡'],
  ['Â·', '·'],
  ['â€¢', '•'],
];

export function normalizeDisplayText(value: string | null | undefined) {
  if (!value) return '';

  return MOJIBAKE_REPLACEMENTS.reduce(
    (text, [broken, fixed]) => text.split(broken).join(fixed),
    value,
  );
}
