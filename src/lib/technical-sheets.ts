import 'server-only';

type SheetIngredient = {
  name?: string | null;
  amount?: string | null;
  quantity?: string | null;
  unit?: string | null;
};

const ALLERGEN_RULES = [
  { label: 'Huevos', terms: ['huevo', 'huevos', 'albumina', 'mahonesa', 'mayonesa'] },
  { label: 'Lácteos', terms: ['leche', 'nata', 'mantequilla', 'queso', 'yogur', 'lacteo', 'lácteo', 'lacteos', 'lácteos', 'parmesano'] },
  { label: 'Gluten', terms: ['harina', 'trigo', 'pan', 'tempura', 'panko', 'cebada', 'centeno'] },
  { label: 'Soja', terms: ['soja', 'soy', 'tofu', 'lecitina de soja'] },
  { label: 'Sulfitos', terms: ['vino', 'vinagre', 'sulfito', 'sulfitos'] },
  { label: 'Frutos secos', terms: ['almendra', 'avellana', 'pistacho', 'nuez', 'anacardo'] },
  { label: 'Pescado', terms: ['pescado', 'anchoa', 'atun', 'atún', 'bacalao', 'salmon', 'salmón'] },
  { label: 'Crustáceos', terms: ['gamba', 'langostino', 'carabinero', 'crustaceo', 'crustáceo', 'crustaceos', 'crustáceos'] },
  { label: 'Moluscos', terms: ['ostra', 'mejillon', 'almeja', 'calamar', 'pulpo', 'molusco'] },
];

const INTOLERANCE_RULES = [
  { label: 'Lactosa', allergens: ['Lácteos'] },
  { label: 'Gluten', allergens: ['Gluten'] },
  { label: 'Histamina', allergens: ['Pescado', 'Moluscos'] },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function inferAllergens(ingredients: SheetIngredient[]) {
  const names = ingredients.map((ingredient) => normalize(String(ingredient.name || '')));
  return ALLERGEN_RULES
    .filter((rule) => names.some((name) => rule.terms.some((term) => name.includes(normalize(term)))))
    .map((rule) => rule.label);
}

export function inferIntolerances(allergens: string[]) {
  return INTOLERANCE_RULES
    .filter((rule) => rule.allergens.some((allergen) => allergens.includes(allergen)))
    .map((rule) => rule.label);
}

export function buildPlatingNotes(title: string, ingredients: SheetIngredient[], category?: string | null) {
  const names = ingredients.map((ingredient) => String(ingredient.name || '').trim()).filter(Boolean);
  const dominant = names.slice(0, 3).join(', ');
  const categoryLabel = String(category || 'producción').toLowerCase();

  if (names.some((name) => normalize(name).includes('huevo'))) {
    return `Servir ${title} de inmediato, con el huevo en su punto, crema o guarnición bien caliente y acabado final sin romper la estructura cremosa del conjunto.`;
  }

  if (names.some((name) => normalize(name).includes('metilcelulosa'))) {
    return `Pasar ${title} al servicio justo tras la fritura o activación térmica, manteniendo la cobertura seca, el interior ligero y la pieza bien escurrida antes del emplatado.`;
  }

  if (names.some((name) => normalize(name).includes('alginato')) || names.some((name) => normalize(name).includes('gluconolactato'))) {
    return `Emplatar ${title} en frío controlado, secando bien las piezas tras el lavado técnico y llevándolas al pase cuando la membrana siga fina y el centro conserve fluidez.`;
  }

  if (categoryLabel.includes('postre') || names.some((name) => normalize(name).includes('mango'))) {
    return `Presentar ${title} con corte limpio, superficie pulida y temperatura estable, evitando condensación y protegiendo el brillo hasta el momento del pase.`;
  }

  return `Finalizar ${title} cuidando temperatura, brillo, limpieza de borde y una disposición ordenada de ${dominant || 'los componentes principales'} para que la ficha sea reproducible en servicio.`;
}

export function enrichTechnicalSheet<T extends { title: string; ingredients?: SheetIngredient[]; allergens?: any; category?: string | null; plating_notes?: string | null }>(sheet: T) {
  const ingredients = Array.isArray(sheet.ingredients) ? sheet.ingredients : [];
  const inferredAllergens = inferAllergens(ingredients);
  const declaredAllergens = Array.isArray(sheet.allergens) ? sheet.allergens.filter(Boolean).map(String) : [];
  const allergens = Array.from(new Set([...declaredAllergens, ...inferredAllergens]));
  const intolerances = inferIntolerances(allergens);

  return {
    ...sheet,
    allergens,
    intolerances,
    plating_notes: sheet.plating_notes && !/^Finalizar\s.+revisión de temperatura/i.test(sheet.plating_notes)
      ? sheet.plating_notes
      : buildPlatingNotes(sheet.title, ingredients, sheet.category),
  };
}
