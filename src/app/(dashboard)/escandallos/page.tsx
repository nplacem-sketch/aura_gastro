'use client';

import { useMemo, useState } from 'react';

import AppIcon from '@/components/AppIcon';
import PlansPopup from '@/components/PlansPopup';
import { useAuth } from '@/lib/auth-context';

type Ingredient = {
  id: string;
  name: string;
  gross_weight: number;
  waste_percent: number;
  price_per_kg: number;
  unit: string;
};

export default function EscandallosPage() {
  const { isPremium, isAdmin, session } = useAuth();
  const authHeaders: HeadersInit = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};

  const [pax, setPax] = useState(10);
  const [recipeName, setRecipeName] = useState('Risotto de Setas Silvestres');
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: '1', name: 'Arroz Carnaroli', gross_weight: 1.2, waste_percent: 0, price_per_kg: 4.5, unit: 'Kg' },
    { id: '2', name: 'Setas Porcini', gross_weight: 0.8, waste_percent: 15, price_per_kg: 28, unit: 'Kg' },
    { id: '3', name: 'Parmigiano Reggiano', gross_weight: 0.2, waste_percent: 5, price_per_kg: 32, unit: 'Kg' },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPlansPopup, setShowPlansPopup] = useState(false);

  const stats = useMemo(() => {
    const total_cost = ingredients.reduce((acc, ing) => acc + ing.gross_weight * ing.price_per_kg, 0);
    return {
      total_cost,
      cost_per_serving: total_cost / (pax || 1),
      total_net_weight: ingredients.reduce((acc, ing) => acc + ing.gross_weight * (1 - ing.waste_percent / 100), 0),
    };
  }, [ingredients, pax]);

  async function searchIngredients(query: string) {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/lab/search?q=${encodeURIComponent(query)}`, { headers: authHeaders });
      const data = await res.json();
      setSearchResults(data || []);
    } finally {
      setIsSearching(false);
    }
  }

  function selectIngredient(ing: any, targetId: string) {
    setIngredients((current) =>
      current.map((item) =>
        item.id === targetId
          ? {
              ...item,
              name: ing.name,
              waste_percent: ing.technical_data?.merma || 0,
              price_per_kg: ing.avg_price || 0,
            }
          : item,
      ),
    );
    setSearchResults([]);
    setSearchQuery('');
  }

  async function saveRecipe() {
    if (!isPremium && !isAdmin) {
      setShowPlansPopup(true);
      return;
    }

    const res = await fetch('/api/recipes/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        name: recipeName,
        pax,
        ingredients,
        total_cost: stats.total_cost,
        cost_per_serving: stats.cost_per_serving,
      }),
    });

    const data = await res.json();
    if (data.success) {
      alert('Escandallo guardado correctamente.');
    } else {
      alert(data.error || 'No se pudo guardar el escandallo.');
    }
  }

  function addIngredient() {
    setIngredients((current) => [
      ...current,
      { id: crypto.randomUUID(), name: 'Nuevo ingrediente', gross_weight: 1, waste_percent: 0, price_per_kg: 0, unit: 'Kg' },
    ]);
  }

  function updateIngredient(id: string, field: keyof Ingredient, value: any) {
    setIngredients((current) => current.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing)));
  }

  function exportA4() {
    const rows = ingredients
      .map((ing, index) => {
        const net = ing.gross_weight * (1 - ing.waste_percent / 100);
        const subtotal = ing.gross_weight * ing.price_per_kg;
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${ing.name}</td>
            <td>${ing.gross_weight.toFixed(3)} ${ing.unit}</td>
            <td>${ing.waste_percent.toFixed(1)}%</td>
            <td>${net.toFixed(3)} ${ing.unit}</td>
            <td>${ing.price_per_kg.toFixed(2)} EUR</td>
            <td>${subtotal.toFixed(2)} EUR</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <html>
        <head>
          <title>${recipeName} - Escandallo</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Georgia, "Times New Roman", serif; color: #101312; background: #f7f2e8; }
            .sheet { width: 100%; min-height: 100vh; background: white; padding: 14mm; border: 1px solid #d9c39a; }
            .header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #c79b49; padding-bottom: 10mm; margin-bottom: 8mm; }
            .brand { font-size: 12px; letter-spacing: 0.35em; text-transform: uppercase; color: #8b6a35; margin-bottom: 8px; }
            h1 { margin: 0; font-size: 30px; line-height: 1.05; }
            .subtitle { margin-top: 8px; color: #4a4f4a; font-size: 13px; }
            .meta { text-align: right; font-size: 11px; line-height: 1.7; color: #3d443d; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 0 0 8mm; }
            .card { border: 1px solid #e3d4b7; background: #fbf7ef; padding: 12px; border-radius: 12px; }
            .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.22em; color: #8b6a35; margin-bottom: 6px; }
            .value { font-size: 22px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { background: #171b18; color: #f8f4ec; text-transform: uppercase; letter-spacing: 0.14em; font-size: 9px; }
            th, td { padding: 9px 8px; border: 1px solid #ddd2bd; text-align: left; vertical-align: top; }
            tbody tr:nth-child(even) { background: #faf6ef; }
            .footer { margin-top: 8mm; display: flex; justify-content: space-between; font-size: 10px; color: #5e655e; border-top: 1px solid #ddd2bd; padding-top: 5mm; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div>
                <div class="brand">Aura Gastronomy</div>
                <h1>${recipeName}</h1>
                <div class="subtitle">Escandallo tecnico listo para impresion en PDF en formato DIN A4.</div>
              </div>
              <div class="meta">
                <div>Fecha: ${new Date().toLocaleDateString('es-ES')}</div>
                <div>Raciones: ${pax} PAX</div>
                <div>Rendimiento neto: ${stats.total_net_weight.toFixed(3)} Kg</div>
              </div>
            </div>

            <div class="summary">
              <div class="card">
                <div class="label">Coste total</div>
                <div class="value">${stats.total_cost.toFixed(2)} EUR</div>
              </div>
              <div class="card">
                <div class="label">Coste por racion</div>
                <div class="value">${stats.cost_per_serving.toFixed(2)} EUR</div>
              </div>
              <div class="card">
                <div class="label">Ingredientes</div>
                <div class="value">${ingredients.length}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ingrediente</th>
                  <th>Peso bruto</th>
                  <th>Merma</th>
                  <th>Peso neto</th>
                  <th>Precio/Kg</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <div class="footer">
              <div>Documento tecnico generado desde Aura Master.</div>
              <div>Imprimir o guardar como PDF.</div>
            </div>
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-20">
      <header className="mb-16 flex justify-between items-start">
        <div>
          <p className="font-label text-secondary text-[10px] uppercase tracking-[0.4em] mb-4">Ingenieria de menu · Aura Master</p>
          <input
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            className="text-6xl font-headline font-light text-on-surface bg-transparent border-none outline-none focus:text-secondary transition-all"
          />
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-outline-variant/10 text-center min-w-[140px]">
          <p className="text-[8px] font-label uppercase tracking-widest text-on-surface-variant mb-1">Raciones (PAX)</p>
          <input
            type="number"
            value={pax}
            onChange={(e) => setPax(parseInt(e.target.value, 10) || 1)}
            className="bg-transparent text-center text-3xl font-headline text-secondary w-full"
          />
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-[40px] border border-outline-variant/10 overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high/50 border-b border-outline-variant/10">
                  <th className="p-6 font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Ingrediente</th>
                  <th className="p-6 font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold text-center">P. Bruto</th>
                  <th className="p-6 font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold text-center">Merma</th>
                  <th className="p-6 font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold text-center">P. Neto</th>
                  <th className="p-6 font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold text-right">Precio/Kg</th>
                  <th className="p-6 font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {ingredients.map((ing) => (
                  <tr key={ing.id} className="hover:bg-white/5 transition-all">
                    <td className="p-6 relative">
                      <input
                        value={ing.name}
                        onChange={(e) => {
                          updateIngredient(ing.id, 'name', e.target.value);
                          void searchIngredients(e.target.value);
                        }}
                        className="bg-transparent text-on-surface font-light focus:text-secondary outline-none w-full"
                        placeholder="Buscar en el Laboratorio..."
                      />
                      {searchResults.length > 0 && searchQuery === ing.name && (
                        <div className="absolute left-6 top-full mt-2 w-64 glass-panel border border-secondary/20 rounded-xl overflow-hidden z-[100] shadow-2xl animate-fade-in">
                          {searchResults.map((res) => (
                            <button
                              key={res.id}
                              onClick={() => selectIngredient(res, ing.id)}
                              className="w-full p-4 text-left hover:bg-secondary/10 transition-colors border-b border-white/5 last:border-none"
                            >
                              <p className="text-xs text-on-surface font-medium">{res.name}</p>
                              <p className="text-[8px] text-on-surface-variant uppercase tracking-widest">{res.category}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-6 text-center">
                      <input type="number" value={ing.gross_weight} onChange={(e) => updateIngredient(ing.id, 'gross_weight', parseFloat(e.target.value) || 0)} className="bg-transparent text-center text-on-surface w-24 border-b border-white/10" />
                      <span className="text-[8px] text-on-surface-variant/40 ml-1">{ing.unit}</span>
                    </td>
                    <td className="p-6 text-center">
                      <input type="number" value={ing.waste_percent} onChange={(e) => updateIngredient(ing.id, 'waste_percent', parseFloat(e.target.value) || 0)} className="bg-transparent text-center text-secondary w-20 border-b border-secondary/20" />
                      <span className="text-[8px] text-on-surface-variant/40">%</span>
                    </td>
                    <td className="p-6 text-center opacity-40 font-light italic">{(ing.gross_weight * (1 - ing.waste_percent / 100)).toFixed(3)}</td>
                    <td className="p-6 text-right">
                      <input type="number" value={ing.price_per_kg} onChange={(e) => updateIngredient(ing.id, 'price_per_kg', parseFloat(e.target.value) || 0)} className="bg-transparent text-right text-on-surface w-20" />
                      <span className="text-[8px] text-on-surface-variant/40 ml-1">EUR</span>
                    </td>
                    <td className="p-6 text-right font-headline text-on-surface">{(ing.gross_weight * ing.price_per_kg).toFixed(2)} EUR</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button onClick={addIngredient} className="w-full py-6 border-t border-outline-variant/10 text-secondary font-label text-[9px] uppercase tracking-widest hover:bg-secondary/5 transition-all flex items-center justify-center gap-3">
              <AppIcon name="add" size={14} />
              AÃ±adir ingrediente al proceso
            </button>
          </div>

          {isSearching && <p className="text-[10px] uppercase tracking-widest text-secondary animate-pulse">Buscando ingredientes verificados...</p>}
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-10 rounded-[40px] border border-outline-variant/10 shadow-3xl bg-gradient-to-br from-surface-container-high/80 to-transparent">
            <h3 className="font-headline text-2xl mb-10 italic">Resumen tÃ©cnico</h3>

            <div className="space-y-8 mb-12">
              <div className="flex justify-between items-center">
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Coste total de producciÃ³n</p>
                <p className="text-4xl font-headline text-on-surface font-light">{stats.total_cost.toFixed(2)} EUR</p>
              </div>
              <div className="flex justify-between items-center border-y border-outline-variant/10 py-6">
                <p className="font-label text-[10px] uppercase tracking-widest text-secondary font-bold">Coste por raciÃ³n</p>
                <p className="text-5xl font-headline text-secondary tracking-tighter">{stats.cost_per_serving.toFixed(2)} EUR</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Rendimiento neto total</p>
                <p className="text-2xl font-headline text-on-surface-variant/60 italic">{stats.total_net_weight.toFixed(3)} Kg</p>
              </div>
            </div>

            <div className="space-y-3">
              <button onClick={saveRecipe} className="w-full py-5 bg-secondary text-black rounded-2xl font-label text-[10px] uppercase tracking-widest font-bold shadow-2xl shadow-secondary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                <AppIcon name="person" size={16} />
                Guardar en mi perfil
              </button>
              <button onClick={exportA4} className="w-full py-5 bg-surface-container-highest text-on-surface rounded-2xl font-label text-[10px] uppercase tracking-widest font-bold hover:bg-white/5 transition-all flex items-center justify-center gap-3">
                <AppIcon name="print" size={16} />
                Exportar PDF profesional
              </button>
            </div>
          </div>

          <div className="p-8 border border-white/5 rounded-[32px] bg-white/5 italic">
            <p className="text-[11px] text-on-surface-variant/60 leading-relaxed font-light">
              El escandallo no es solo un coste: es la hoja de control que protege margen, regularidad y calidad de pase.
            </p>
          </div>
        </div>
      </main>

      <PlansPopup open={showPlansPopup} onClose={() => setShowPlansPopup(false)} requiredTier="PREMIUM" />
    </div>
  );
}
