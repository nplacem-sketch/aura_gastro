'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import AppIcon from '@/components/AppIcon';
import { useAuth } from '@/lib/auth-context';

type TechnicalSheet = {
  id: string;
  title: string;
  category?: string | null;
  plan_tier?: string | null;
  yield_text?: string | null;
  ingredients: Array<{ name?: string; amount?: string; quantity?: string; unit?: string }>;
  method: string;
  allergens?: string[] | null;
  intolerances?: string[] | null;
  cost_summary?: Record<string, any> | null;
  created_at: string;
};

type Escandallo = {
  id: string;
  name: string;
  pax?: number | null;
  ingredients: Array<{ name?: string; gross_weight?: number; waste_percent?: number; price_per_kg?: number; unit?: string }>;
  total_cost?: number | null;
  cost_per_serving?: number | null;
};

const emptyForm = {
  title: '',
  category: 'Producción',
  plan_tier: 'PREMIUM',
  yield_text: '10 PAX',
  ingredientsText: '',
  method: '',
  allergens: '',
};

export default function FichasTecnicasPage() {
  const { isPremium, isAdmin, loading, session } = useAuth();
  const [sheets, setSheets] = useState<TechnicalSheet[]>([]);
  const [escandallos, setEscandallos] = useState<Escandallo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const accessToken = session?.access_token ?? null;

  const loadData = useCallback(async () => {
    const res = await fetch('/api/technical-sheets', {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      cache: 'no-store',
    });
    const data = await res.json();
    setSheets(data.sheets ?? []);
    setEscandallos(data.escandallos ?? []);
    if (!selectedId && data.sheets?.[0]?.id) {
      setSelectedId(data.sheets[0].id);
    }
  }, [accessToken, selectedId]);

  useEffect(() => {
    if (session?.access_token) {
      void loadData();
    }
  }, [loadData, session?.access_token]);

  const selectedSheet = useMemo(
    () => sheets.find((sheet) => sheet.id === selectedId) ?? sheets[0] ?? null,
    [selectedId, sheets],
  );

  if (loading) return null;

  if (!isPremium && !isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 animate-fade-in">
        <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center mb-8 border border-secondary/20">
          <AppIcon name="lock" size={48} className="text-secondary opacity-50" />
        </div>
        <h2 className="text-4xl font-headline text-on-surface mb-4">Módulo <span className="italic text-secondary">Premium</span></h2>
        <p className="text-on-surface-variant font-light max-w-md mx-auto mb-10 leading-relaxed">
          La estandarización de producción y el archivo maestro de fichas técnicas forman parte del plan Premium.
        </p>
        <Link href="/plans" className="bg-secondary text-black px-12 py-5 rounded-2xl font-label text-[10px] uppercase tracking-[0.2em] font-bold shadow-2xl shadow-secondary/20 hover:scale-[1.02] transition-all">
          Elevar mi plan ahora
        </Link>
      </div>
    );
  }

  async function createSheet() {
    setSaving(true);

    const ingredients = form.ingredientsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, ...rest] = line.split(':');
        return { name: name.trim(), amount: rest.join(':').trim() || '' };
      });

    const res = await fetch('/api/technical-sheets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        title: form.title,
        category: form.category,
        plan_tier: form.plan_tier,
        yield_text: form.yield_text,
        ingredients,
        method: form.method,
        allergens: form.allergens.split(',').map((value) => value.trim()).filter(Boolean),
      }),
    });

    const data = await res.json();
    if (data.sheet) {
      setShowCreate(false);
      setForm(emptyForm);
      await loadData();
      setSelectedId(data.sheet.id);
    }

    setSaving(false);
  }

  function importEscandallo(escandallo: Escandallo) {
    const method = [
      `1. Revisar la mise en place completa de ${escandallo.name}, verificar pesos brutos, mermas y costes antes de arrancar producción.`,
      '2. Preparar cada subproceso por orden de cocción, regeneración y servicio, dejando etiquetados los recipientes y los puntos de control.',
      '3. Ejecutar la producción por lotes, validando rendimiento neto, temperatura y sabor antes de emplatar o abatir.',
      '4. Registrar incidencias, rendimiento final y observaciones del pase para repetir la elaboración con la misma regularidad.',
    ].join('\n\n');

    setForm({
      title: escandallo.name,
      category: 'Producción',
      plan_tier: 'PREMIUM',
      yield_text: `${escandallo.pax || 1} PAX`,
      ingredientsText: (escandallo.ingredients || [])
        .map((item) => `${item.name || 'Ingrediente'}: ${item.gross_weight || 0} ${item.unit || 'kg'}`)
        .join('\n'),
      method,
      allergens: '',
    });
    setShowCreate(true);
  }

  function exportSheetA4(sheet: TechnicalSheet) {
    const ingredientsRows = (sheet.ingredients || [])
      .map(
        (ingredient) => `
          <tr>
            <td>${ingredient.name || 'Ingrediente'}</td>
            <td>${ingredient.amount || [ingredient.quantity, ingredient.unit].filter(Boolean).join(' ') || 'Cantidad no indicada'}</td>
          </tr>
        `,
      )
      .join('');

    const stepsHtml = sheet.method
      .split(/\n{2,}|\n/)
      .filter(Boolean)
      .map((step, index) => `<div class="step"><div class="step-number">${index + 1}</div><div class="step-text">${step}</div></div>`)
      .join('');

    const html = `
      <html>
        <head>
          <title>${sheet.title} - Ficha técnica</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { margin: 0; font-family: Georgia, "Times New Roman", serif; color: #101312; background: #f7f2e8; }
            * { box-sizing: border-box; }
            .sheet { background: #fff; min-height: 100vh; padding: 14mm; border: 1px solid #d9c39a; }
            .header { display:flex; justify-content:space-between; gap:16px; border-bottom:2px solid #c79b49; padding-bottom:8mm; margin-bottom:7mm; }
            .brand { font-size:12px; letter-spacing:.35em; text-transform:uppercase; color:#8b6a35; margin-bottom:8px; }
            h1 { margin:0; font-size:28px; line-height:1.08; }
            .meta { font-size:11px; line-height:1.7; text-align:right; color:#3d443d; }
            .subtitle { margin-top:8px; font-size:13px; color:#4a4f4a; }
            .grid { display:grid; grid-template-columns: 1.1fr 1fr; gap:12px; margin-bottom:8mm; }
            .card { border:1px solid #e3d4b7; background:#fbf7ef; border-radius:12px; padding:12px; }
            .label { font-size:10px; text-transform:uppercase; letter-spacing:.22em; color:#8b6a35; margin-bottom:6px; }
            table { width:100%; border-collapse:collapse; font-size:11px; }
            th, td { border:1px solid #ddd2bd; padding:8px; text-align:left; vertical-align:top; }
            th { background:#171b18; color:#f8f4ec; text-transform:uppercase; letter-spacing:.14em; font-size:9px; }
            .step { display:flex; gap:12px; margin-bottom:10px; }
            .step-number { width:28px; height:28px; border-radius:50%; background:#f2e1bd; color:#5b4722; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:bold; flex-shrink:0; }
            .step-text { font-size:12px; line-height:1.7; color:#2c312d; }
            .footer-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-top:7mm; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div>
                <div class="brand">Aura Gastronomy</div>
                <h1>${sheet.title}</h1>
                <div class="subtitle">${sheet.category || 'Producción'} · ${sheet.plan_tier || 'PREMIUM'} · ${sheet.yield_text || 'Sin rendimiento definido'}</div>
              </div>
              <div class="meta">
                <div>Fecha: ${new Date().toLocaleDateString('es-ES')}</div>
                <div>Plan: ${sheet.plan_tier || 'PREMIUM'}</div>
                <div>Rendimiento: ${sheet.yield_text || 'Pendiente'}</div>
              </div>
            </div>
            <div class="card" style="margin-bottom: 8mm;">
              <div class="label">Ingredientes</div>
              <table>
                <thead><tr><th>Ingrediente</th><th>Cantidad</th></tr></thead>
                <tbody>${ingredientsRows}</tbody>
              </table>
            </div>
            <div class="card">
              <div class="label">Método de elaboración</div>
              ${stepsHtml}
            </div>
            <div class="footer-grid">
              <div class="card">
                <div class="label">Alérgenos</div>
                <div class="step-text">${sheet.allergens?.length ? sheet.allergens.join(', ') : 'No declarados'}</div>
              </div>
              <div class="card">
                <div class="label">Intolerancias</div>
                <div class="step-text">${sheet.intolerances?.length ? sheet.intolerances.join(', ') : 'Sin alertas específicas'}</div>
              </div>
              <div class="card">
                <div class="label">Control de coste</div>
                <div class="step-text">Coste total: ${sheet.cost_summary?.total_cost ? `${Number(sheet.cost_summary.total_cost).toFixed(2)} EUR` : 'Pendiente'}</div>
              </div>
            </div>
          </div>
          <script>window.onload = () => window.print();</script>
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
    <div className="max-w-7xl mx-auto pb-20">
      <header className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-label text-secondary text-[10px] uppercase tracking-[0.4em] mb-4">Estandarización de Producción</p>
          <h1 className="text-5xl font-headline font-light text-on-surface">Fichas <span className="italic text-secondary">técnicas</span></h1>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((prev) => !prev)}
          className="bg-surface-container-high border border-outline-variant/10 text-on-surface px-8 py-4 rounded-2xl font-label text-[10px] uppercase tracking-widest hover:bg-surface-container-highest transition-all"
        >
          {showCreate ? 'Cerrar creación' : 'Crear nueva ficha'}
        </button>
      </header>

      {showCreate && (
        <section className="mb-10 glass-panel p-8 rounded-[32px] border border-secondary/20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Nombre de la ficha" className="bg-surface-container-high rounded-2xl px-5 py-4 outline-none" />
            <input value={form.yield_text} onChange={(e) => setForm((prev) => ({ ...prev, yield_text: e.target.value }))} placeholder="Rendimiento" className="bg-surface-container-high rounded-2xl px-5 py-4 outline-none" />
            <input value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Categoría" className="bg-surface-container-high rounded-2xl px-5 py-4 outline-none" />
            <input value={form.plan_tier} onChange={(e) => setForm((prev) => ({ ...prev, plan_tier: e.target.value.toUpperCase() }))} placeholder="Plan" className="bg-surface-container-high rounded-2xl px-5 py-4 outline-none" />
            <textarea value={form.ingredientsText} onChange={(e) => setForm((prev) => ({ ...prev, ingredientsText: e.target.value }))} placeholder="Ingredientes, una línea por ingrediente. Ejemplo: Fondo oscuro: 2 L" className="lg:col-span-2 min-h-[180px] bg-surface-container-high rounded-2xl px-5 py-4 outline-none" />
            <textarea value={form.method} onChange={(e) => setForm((prev) => ({ ...prev, method: e.target.value }))} placeholder="Método de elaboración paso a paso" className="lg:col-span-2 min-h-[220px] bg-surface-container-high rounded-2xl px-5 py-4 outline-none" />
            <textarea value={form.allergens} onChange={(e) => setForm((prev) => ({ ...prev, allergens: e.target.value }))} placeholder="Alérgenos separados por coma" className="min-h-[120px] bg-surface-container-high rounded-2xl px-5 py-4 outline-none" />
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <button type="button" onClick={createSheet} disabled={saving} className="bg-secondary text-black px-8 py-4 rounded-2xl font-label text-[10px] uppercase tracking-widest font-bold disabled:opacity-40">
              {saving ? 'Guardando...' : 'Guardar ficha técnica'}
            </button>
            {escandallos.slice(0, 3).map((item) => (
              <button key={item.id} type="button" onClick={() => importEscandallo(item)} className="px-6 py-4 rounded-2xl bg-surface-container-high text-on-surface text-[10px] uppercase tracking-widest font-label">
                Importar {item.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-10">
        <div className="space-y-4">
          {sheets.map((sheet) => (
            <button
              key={sheet.id}
              type="button"
              onClick={() => setSelectedId(sheet.id)}
              className={`w-full text-left rounded-[28px] border p-6 transition-all ${selectedSheet?.id === sheet.id ? 'border-secondary bg-secondary/5' : 'border-outline-variant/10 bg-surface-container/20 hover:bg-surface-container-high'}`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <span className="text-[9px] uppercase tracking-widest text-secondary font-label">{sheet.plan_tier || 'PREMIUM'}</span>
                <AppIcon name="description" size={18} className="text-on-surface-variant opacity-40" />
              </div>
              <p className="font-headline text-2xl text-on-surface leading-tight">{sheet.title}</p>
              <p className="text-xs text-on-surface-variant mt-3">{sheet.category || 'Producción'} · {sheet.yield_text || 'Sin rendimiento definido'}</p>
            </button>
          ))}
        </div>

        <div className="glass-panel rounded-[40px] border border-outline-variant/10 p-10 min-h-[560px]">
          {selectedSheet ? (
            <div className="space-y-10">
              <div className="flex flex-col gap-5 border-b border-outline-variant/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-col gap-3">
                  <p className="font-label text-secondary text-[10px] uppercase tracking-[0.4em]">{selectedSheet.category || 'Producción'} | {selectedSheet.plan_tier || 'PREMIUM'}</p>
                  <h2 className="text-4xl font-headline text-on-surface">{selectedSheet.title}</h2>
                  <p className="text-on-surface-variant">{selectedSheet.yield_text || 'Rendimiento no informado'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => exportSheetA4(selectedSheet)}
                  className="inline-flex items-center justify-center gap-3 bg-surface-container-high text-on-surface px-6 py-4 rounded-2xl font-label text-[10px] uppercase tracking-widest hover:bg-secondary hover:text-black transition-all"
                >
                  <AppIcon name="print" size={16} />
                  Exportar / imprimir
                </button>
              </div>

              <section>
                <h3 className="font-label text-secondary text-[10px] uppercase tracking-widest mb-4">Ingredientes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(selectedSheet.ingredients || []).map((ingredient, index) => (
                    <div key={`${ingredient.name}-${index}`} className="rounded-2xl bg-surface-container-high px-5 py-4">
                      <p className="text-on-surface">{ingredient.name || 'Ingrediente'}</p>
                      <p className="text-xs text-on-surface-variant mt-1">{ingredient.amount || [ingredient.quantity, ingredient.unit].filter(Boolean).join(' ') || 'Cantidad no indicada'}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="font-label text-secondary text-[10px] uppercase tracking-widest mb-4">Método de elaboración</h3>
                <div className="space-y-4">
                  {selectedSheet.method.split(/\n{2,}|\n/).filter(Boolean).map((step, index) => (
                    <div key={`${index}-${step}`} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-label text-[10px]">{index + 1}</div>
                      <p className="text-on-surface-variant leading-relaxed flex-1">{step}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-[28px] border border-outline-variant/10 p-6">
                  <h3 className="font-label text-secondary text-[10px] uppercase tracking-widest mb-3">Alérgenos</h3>
                  <p className="text-on-surface-variant">{selectedSheet.allergens?.length ? selectedSheet.allergens.join(', ') : 'No declarados'}</p>
                </div>
                <div className="rounded-[28px] border border-outline-variant/10 p-6">
                  <h3 className="font-label text-secondary text-[10px] uppercase tracking-widest mb-3">Intolerancias</h3>
                  <p className="text-on-surface-variant">{selectedSheet.intolerances?.length ? selectedSheet.intolerances.join(', ') : 'Sin alertas específicas'}</p>
                </div>
                <div className="rounded-[28px] border border-outline-variant/10 p-6">
                  <h3 className="font-label text-secondary text-[10px] uppercase tracking-widest mb-3">Control de coste</h3>
                  <p className="text-on-surface-variant">
                    Coste total: {selectedSheet.cost_summary?.total_cost ? `${Number(selectedSheet.cost_summary.total_cost).toFixed(2)} EUR` : 'Pendiente'}
                  </p>
                </div>
              </section>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <AppIcon name="description" size={56} className="mb-6" />
              <p className="font-headline text-2xl">Todavía no hay fichas técnicas visibles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
