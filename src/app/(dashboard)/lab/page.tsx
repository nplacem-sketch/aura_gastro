'use client';

import { useEffect, useState } from 'react';

import AppIcon from '@/components/AppIcon';
import { canAccessTier } from '@/lib/access';
import { useAuth } from '@/lib/auth-context';
import { labDb } from '@/lib/supabase';

type Ingredient = {
  id: string;
  name: string;
  scientific_name?: string;
  category: string;
  culinary_notes: string;
  origin_region: string;
  best_season: string | string[];
  technical_data?: Record<string, any>;
  is_premium: boolean;
  tier?: string;
  created_at: string;
};

export default function LabPage() {
  const { plan, role } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState<Ingredient | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const PAGE_SIZE = 48;

  const [newIngredient, setNewIngredient] = useState<Partial<Ingredient>>({
    name: '',
    scientific_name: '',
    category: 'ESTABILIZANTE',
    culinary_notes: '',
    origin_region: '',
    best_season: 'Todo el año',
    technical_data: { 'Poder gelificante': '0', Solubilidad: 'Alta' },
    is_premium: true,
    tier: 'PREMIUM',
  });

  const formatBestSeason = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value.join(', ') : value || 'Todo el año';

  const resolveTier = (ingredient: Partial<Ingredient>) =>
    ingredient.tier ?? (ingredient.is_premium ? 'PREMIUM' : 'FREE');

  const buildSpecialistNote = (ingredient: Ingredient) => {
    const explicitNote =
      ingredient.technical_data?.['Nota del especialista'] ||
      ingredient.technical_data?.['nota_del_especialista'] ||
      ingredient.technical_data?.specialist_note;

    if (explicitNote) return String(explicitNote);

    const season = formatBestSeason(ingredient.best_season).toLowerCase();
    const category = ingredient.category.toLowerCase();
    const origin = ingredient.origin_region || 'origen controlado';

    return `${ingredient.name} se trabaja como ${category} de perfil estable. Su mejor ventana operativa es ${season}, con especial atención al origen ${origin} y a una dosificación ajustada al equilibrio final del plato.`;
  };

  async function handleAdd() {
    if (!newIngredient.name) return;

    const payload = {
      ...newIngredient,
      tier: resolveTier(newIngredient),
      best_season: Array.isArray(newIngredient.best_season)
        ? newIngredient.best_season
        : [newIngredient.best_season || 'Todo el año'],
    };

    const { error } = await labDb().from('ingredients').insert([payload]);
    if (!error) {
      setIsAdding(false);
      await fetchIngredients(0, true);
      setNewIngredient({
        name: '',
        scientific_name: '',
        category: 'ESTABILIZANTE',
        culinary_notes: '',
        origin_region: '',
        best_season: 'Todo el año',
        technical_data: { 'Poder gelificante': '0', Solubilidad: 'Alta' },
        is_premium: true,
        tier: 'PREMIUM',
      });
    }
  }

  async function selectIngredient(item: Ingredient) {
    if (!canAccessTier(plan, resolveTier(item), role)) return;

    setSelected(item);

    if (!item.technical_data) {
      const { data } = await labDb()
        .from('ingredients')
        .select('id,technical_data,tier')
        .eq('id', item.id)
        .single();

      if (data?.technical_data) {
        setSelected((prev) => (prev ? { ...prev, technical_data: data.technical_data, tier: data.tier } : null));
      }
    }
  }

  useEffect(() => {
    void fetchIngredients(0, true);
  }, []);

  async function fetchIngredients(pageIndex = 0, reset = false) {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data } = await labDb()
      .from('ingredients')
      .select('id,name,scientific_name,category,culinary_notes,origin_region,best_season,is_premium,tier,created_at')
      .order('name')
      .range(from, to);

    const rows = (data ?? []).map((item) => ({
      ...item,
      best_season: Array.isArray(item.best_season) ? item.best_season : [],
    }));

    setIngredients((prev) => (reset ? rows : [...prev, ...rows]));
    setHasMore(rows.length === PAGE_SIZE);
    setPage(pageIndex);
    if (reset) setLoading(false);
    else setLoadingMore(false);
  }

  const filtered = ingredients.filter((ingredient) => {
    const matchesSearch = ingredient.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || ingredient.category === filter;
    return matchesSearch && matchesFilter;
  });

  const categories = ['ALL', 'ESTABILIZANTE', 'TEXTURIZANTE', 'ESPUMANTE', 'EMULSIFICANTE', 'SABORIZANTE'];

  if (loading && ingredients.length === 0) {
    return <div className="p-20 text-center font-label text-xs uppercase tracking-[0.5em] text-secondary animate-pulse">Calibrando sensores moleculares...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 relative">
      <header className="mb-16 flex flex-col md:flex-row justify-between items-end gap-8">
        <div className="animate-slide-up">
          <p className="font-label text-secondary text-[10px] uppercase tracking-[0.4em] mb-4">Investigación Técnica</p>
          <h1 className="text-6xl font-headline font-light text-on-surface">Aura <span className="italic text-secondary">Lab</span></h1>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <div className="flex-1 md:w-80 relative group">
            <AppIcon
              name="search"
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-secondary transition-colors"
              aria-label="Buscar"
            />
            <input
              type="text"
              placeholder="Identificar componente..."
              className="w-full bg-surface-container-high border border-outline-variant/10 rounded-xl py-4 pl-12 pr-6 text-sm font-light text-on-surface focus:ring-1 focus:ring-secondary/20 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="flex gap-4 mb-12 overflow-x-auto pb-4 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setFilter(category)}
            className={`px-8 py-3 rounded-full font-label text-[9px] uppercase tracking-widest transition-all ${
              filter === category
                ? 'bg-secondary text-on-secondary shadow-lg shadow-secondary/20'
                : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/10 hover:border-secondary'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
          <div className="glass-panel w-full max-w-xl rounded-3xl border border-outline-variant/10 p-10 shadow-2xl animate-scale-in">
            <h3 className="font-headline text-3xl text-on-surface mb-8">Registrar Componente</h3>
            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="Nombre del Ingrediente"
                  className="bg-surface-container-high border border-outline-variant/10 p-4 rounded-xl text-sm"
                  onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                />
                <input
                  placeholder="Nombre Cientifico"
                  className="bg-surface-container-high border border-outline-variant/10 p-4 rounded-xl text-sm"
                  onChange={(e) => setNewIngredient({ ...newIngredient, scientific_name: e.target.value })}
                />
              </div>
              <select
                className="w-full bg-surface-container-high border border-outline-variant/10 p-4 rounded-xl text-sm appearance-none"
                onChange={(e) => setNewIngredient({ ...newIngredient, category: e.target.value })}
              >
                {categories.filter((item) => item !== 'ALL').map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                className="w-full bg-surface-container-high border border-outline-variant/10 p-4 rounded-xl text-sm appearance-none"
                onChange={(e) => setNewIngredient({ ...newIngredient, tier: e.target.value, is_premium: e.target.value !== 'FREE' })}
                value={newIngredient.tier}
              >
                {['FREE', 'PRO', 'PREMIUM'].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Notas Culinarias"
                className="w-full bg-surface-container-high border border-outline-variant/10 p-4 rounded-xl text-sm h-32"
                onChange={(e) => setNewIngredient({ ...newIngredient, culinary_notes: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="Región de origen"
                  className="bg-surface-container-high border border-outline-variant/10 p-4 rounded-xl text-sm"
                  onChange={(e) => setNewIngredient({ ...newIngredient, origin_region: e.target.value })}
                />
                <input
                  placeholder="Mejor Temporada"
                  className="bg-surface-container-high border border-outline-variant/10 p-4 rounded-xl text-sm"
                  onChange={(e) => setNewIngredient({ ...newIngredient, best_season: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={handleAdd} className="flex-1 py-4 bg-secondary text-on-secondary rounded-xl font-label text-[10px] uppercase tracking-widest font-bold">
                Guardar en Laboratorio
              </button>
              <button onClick={() => setIsAdding(false)} className="flex-1 py-4 glass-panel text-on-surface rounded-xl font-label text-[10px] uppercase tracking-widest font-bold">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/40">
          <div className="glass-panel w-full max-w-4xl rounded-[40px] border border-outline-variant/10 overflow-hidden shadow-2xl animate-scale-in flex flex-col md:flex-row h-[80vh]">
            <div className="md:w-1/3 bg-surface-container-high p-12 flex flex-col justify-between border-r border-outline-variant/5">
              <div>
                <AppIcon name="microscope" size={56} className="text-secondary mb-8" aria-label="Análisis" />
                <h2 className="text-4xl font-headline text-on-surface mb-2">{selected.name}</h2>
                <p className="font-label text-[10px] text-secondary uppercase tracking-[0.3em] font-bold">
                  {selected.category} | {selected.scientific_name || 'GENÉRICO'}
                </p>
              </div>
              <div className="space-y-6">
                <div>
                  <p className="text-[8px] font-label text-on-surface-variant uppercase tracking-[0.2em] mb-2">Temporada óptima</p>
                  <p className="text-xl font-headline text-on-surface">{formatBestSeason(selected.best_season)}</p>
                </div>
                <button onClick={() => setSelected(null)} className="w-full py-4 border border-outline-variant/20 text-on-surface-variant rounded-2xl font-label text-[10px] uppercase tracking-widest hover:bg-surface-container-highest transition-all">
                  Cerrar análisis
                </button>
              </div>
            </div>
            <div className="flex-1 p-12 overflow-y-auto space-y-12">
              <section>
                <h4 className="font-label text-[10px] uppercase tracking-widest text-secondary mb-6">Perfil organoléptico</h4>
                <p className="text-lg font-light leading-relaxed text-on-surface">{selected.culinary_notes}</p>
              </section>

              <section className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="font-label text-[10px] uppercase tracking-widest text-secondary mb-6">Sinergias de Sabor</h4>
                  <div className="space-y-3">
                    {[selected.category, selected.origin_region || 'Origen técnico', formatBestSeason(selected.best_season)].map((entry) => (
                      <div key={entry} className="flex items-center gap-3 text-sm font-light text-on-surface-variant">
                        <span className="w-1 h-1 rounded-full bg-secondary"></span>
                        {entry}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-label text-[10px] uppercase tracking-widest text-secondary mb-6">Métricas técnicas</h4>
                  <div className="space-y-4">
                    {selected.technical_data &&
                      Object.entries(selected.technical_data).map(([key, value]) => (
                        <div key={key} className="flex justify-between border-b border-outline-variant/5 pb-2">
                          <span className="text-[9px] font-label uppercase text-[#afcdc3]/40">{key}</span>
                          <span className="text-xs font-light text-on-surface">{String(value)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </section>

              <div className="p-8 rounded-3xl bg-secondary/5 border border-secondary/10">
                <h5 className="font-headline text-xl text-secondary mb-2">Nota del especialista</h5>
                <p className="text-xs font-light text-on-surface-variant italic">{buildSpecialistNote(selected)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {filtered.map((item) => {
          const accessTier = resolveTier(item);
          const accessible = canAccessTier(plan, accessTier, role);

          return (
            <div
              key={item.id}
              onClick={() => selectIngredient(item)}
              className={`glass-panel p-8 rounded-3xl transition-all group border border-outline-variant/5 duration-500 flex flex-col h-full relative overflow-hidden cursor-pointer ${accessible ? 'hover:bg-surface-container-high hover:-translate-y-2' : 'opacity-75'}`}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-secondary/0 group-hover:bg-secondary/40 animate-pulse transition-all"></div>
              {!accessible && (
                <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                  <AppIcon name="lock" size={28} className="text-secondary mb-3 opacity-60" />
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface mb-2">Acceso {accessTier}</p>
                  <p className="text-[10px] text-on-surface-variant">Actualiza tu plan para abrir esta ficha validada.</p>
                </div>
              )}

              <div className="flex justify-between items-start mb-8">
                <div className="w-12 h-12 bg-surface-container-high rounded-2xl flex items-center justify-center border border-outline-variant/10 group-hover:scale-110 transition-transform">
                  <AppIcon name="biotech" className="text-secondary" />
                </div>
                <p className="text-[10px] font-label text-secondary font-bold uppercase tracking-widest">{accessTier}</p>
              </div>

              <h3 className="font-headline text-2xl text-on-surface mb-3 group-hover:text-secondary transition-colors">{item.name}</h3>
              <p className="text-on-surface-variant text-xs line-clamp-3 mb-8 leading-relaxed font-light flex-1">{item.culinary_notes}</p>

              <div className="space-y-3 mb-8">
                {item.technical_data &&
                  Object.entries(item.technical_data)
                    .slice(0, 3)
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center text-[10px] font-label uppercase tracking-tighter">
                        <span className="text-[#afcdc3]/40">{key}</span>
                        <span className="text-on-surface">{String(value)}</span>
                      </div>
                    ))}
              </div>

              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-outline-variant/10">
                <div>
                  <p className="text-[8px] font-label text-on-surface-variant uppercase tracking-[0.2em] mb-1">Origen Natural</p>
                  <p className="text-[10px] text-on-surface uppercase tracking-widest truncate">{item.origin_region}</p>
                </div>
                <div>
                  <p className="text-[8px] font-label text-on-surface-variant uppercase tracking-[0.2em] mb-1">Mejor Temporada</p>
                  <p className="text-[10px] text-on-surface uppercase tracking-widest">{formatBestSeason(item.best_season)}</p>
                </div>
              </div>
            </div>
          );
        })}

        {hasMore && !search && filter === 'ALL' && (
          <div className="md:col-span-3 lg:col-span-4 flex justify-center pt-4">
            <button
              onClick={() => fetchIngredients(page + 1)}
              disabled={loadingMore}
              className="px-10 py-4 border border-secondary/30 text-secondary rounded-xl font-label text-[10px] uppercase tracking-widest hover:bg-secondary/10 transition-all disabled:opacity-40"
            >
              {loadingMore ? 'Cargando...' : 'Cargar más componentes'}
            </button>
          </div>
        )}

        <div
          onClick={() => setIsAdding(true)}
          className="border-2 border-dashed border-outline-variant/10 rounded-3xl flex flex-col items-center justify-center p-12 text-[#afcdc3]/20 hover:text-secondary/40 hover:border-secondary/20 transition-all cursor-crosshair group h-full"
        >
          <AppIcon name="add_circle" size={44} className="mb-4 group-hover:rotate-180 transition-all duration-700" aria-label="Nuevo" />
          <span className="font-label text-[10px] uppercase tracking-[0.5em]">Nuevo protocolo</span>
        </div>
      </div>
    </div>
  );
}
