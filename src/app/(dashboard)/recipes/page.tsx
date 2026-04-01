'use client';

import Link from 'next/link';
import AppIcon from '@/components/AppIcon';

export default function RecipeMainPage() {
  return (
    <div className="mx-auto max-w-4xl pb-24">
      <header className="mb-16 border-b border-outline-variant/10 pb-12 text-center">
        <p className="mb-4 font-label text-xs uppercase tracking-[0.4em] text-secondary">
          Canon de Excelencia
        </p>
        <h1 className="mb-6 font-headline text-6xl font-light tracking-tight text-on-surface">
          Manual de{' '}
          <span className="font-normal italic text-secondary">Protocolo Técnico</span>
        </h1>
        <div className="flex justify-center gap-8 font-label text-[10px] uppercase tracking-widest text-[#afcdc3]/40">
          <span className="flex items-center gap-2">
            <AppIcon name="workspace_premium" size={14} className="text-secondary" />
            Doctrina AURA
          </span>
          <span className="flex items-center gap-2">
            <AppIcon name="science" size={14} className="text-secondary" />
            Estandar Michelin
          </span>
          <span className="flex items-center gap-2">
            <AppIcon name="menu_book" size={14} className="text-secondary" />
            v1.0
          </span>
        </div>
      </header>

      <div className="glass-panel relative overflow-hidden rounded-[2.5rem] border border-outline-variant/10 bg-surface/5 px-12 py-16 backdrop-blur-3xl lg:px-20">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-secondary/5 blur-[100px]" />

        <div className="space-y-20">

          {/* Sección 1 */}
          <section>
            <h2 className="mb-6 flex items-center gap-4 font-headline text-3xl font-light tracking-tight text-secondary">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-secondary/20 bg-secondary/5 font-label text-sm text-secondary">01</span>
              Fundamentos de la Excelencia Operativa
            </h2>
            <p className="mb-4 leading-relaxed text-on-surface-variant">
              El presente documento constituye el canon doctrinal para la ejecución de la cocina de vanguardia en{' '}
              <strong className="text-on-surface">AURA GASTRONOMY</strong>. Bajo la premisa de Ferran Adrià,{' '}
              <em>&ldquo;Creatividad es no copiar&rdquo;</em>, establecemos que la innovación culinaria no es un fenómeno
              fortuito, sino el resultado del rigor científico y la disciplina técnica.
            </p>
            <p className="leading-relaxed text-on-surface-variant">
              Adoptamos la <strong className="text-on-surface">Metodología Sapiens</strong> como pilar de nuestra investigación:
              un sistema holístico diseñado para &ldquo;comprender para crear&rdquo;. No basta con ejecutar una receta; es
              imperativo analizar el ingrediente desde su origen biológico, su evolución histórica y sus propiedades físicas y
              químicas.
            </p>
          </section>

          {/* Sección 2 */}
          <section>
            <h2 className="mb-6 flex items-center gap-4 font-headline text-3xl font-light tracking-tight text-secondary">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-secondary/20 bg-secondary/5 font-label text-sm text-secondary">02</span>
              Metrología y Termometría de Alta Precisión
            </h2>
            <p className="mb-6 leading-relaxed text-on-surface-variant">
              En la alta gastronomía, la inconsistencia es el síntoma de una técnica deficiente.
            </p>
            <h3 className="mb-3 font-label text-xs uppercase tracking-widest text-on-surface">Protocolo de Pesaje y Reología</h3>
            <ul className="mb-6 space-y-2 text-on-surface-variant">
              <li className="flex gap-3"><span className="mt-1 text-secondary">—</span><span><strong className="text-on-surface">Instrumentación:</strong> Balanzas analíticas con resolución de <strong className="text-on-surface">0.01g</strong> obligatorias.</span></li>
              <li className="flex gap-3"><span className="mt-1 text-secondary">—</span><span><strong className="text-on-surface">Precisión Química:</strong> El pesaje de hidrocoloides no admite desviaciones. Variaciones mínimas alteran la reología del producto final.</span></li>
              <li className="flex gap-3"><span className="mt-1 text-secondary">—</span><span><strong className="text-on-surface">Monitoreo de pH:</strong> Líquidos con <strong className="text-on-surface">pH inferior a 3</strong> inhiben la reticulación. Neutralizar con bicarbonato de sodio.</span></li>
            </ul>
            <h3 className="mb-3 font-label text-xs uppercase tracking-widest text-on-surface">Control de Termodinámica Culinaria</h3>
            <ul className="space-y-2 text-on-surface-variant">
              <li className="flex gap-3"><span className="mt-1 text-secondary">—</span><span><strong className="text-on-surface">Desnaturalización:</strong> Distinguir entre proteínas globulares y tejido conectivo (colágeno).</span></li>
              <li className="flex gap-3"><span className="mt-1 text-secondary">—</span><span><strong className="text-on-surface">Sous-Vide:</strong> Termocirculadores (Roner) prescritos para rangos de <strong className="text-on-surface">50–80°C</strong>.</span></li>
            </ul>
          </section>

          {/* Sección 3 — Tabla */}
          <section>
            <h2 className="mb-6 flex items-center gap-4 font-headline text-3xl font-light tracking-tight text-secondary">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-secondary/20 bg-secondary/5 font-label text-sm text-secondary">03</span>
              Ingeniería de la Despensa Modernista
            </h2>
            <div className="overflow-x-auto rounded-xl border border-outline-variant/10 bg-black/20">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/10 bg-secondary/5 font-label text-[10px] uppercase tracking-widest text-secondary">
                    <th className="px-6 py-4">Agente</th>
                    <th className="px-6 py-4 text-center">Prop. (%)</th>
                    <th className="px-6 py-4">Función Reológica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5 font-light text-on-surface-variant">
                  {[
                    ['Alginato de Sodio', '0.5 – 1.0', 'Gelificante iónico para esferificación directa e inversa.'],
                    ['Goma Xantana', '0.1 – 0.2', 'Espesante y suspensor; estabiliza emulsiones sin alterar sabor.'],
                    ['Lecitina de Soja', '0.2 – 0.5', 'Emulsionante para la creación de Aires (burbujas ligeras).'],
                    ['Agar-Agar', '0.5 – 2.0', 'Gelificante termoresistente. Espaguetis vegetales.'],
                    ['Maltodextrina (N-Zorbit)', 'Variable', 'Terrificación: transformación de grasas en polvo.'],
                    ['Gluconolactato Ca', '1.0 – 2.0', 'Esferificación inversa, sin sabor amargo.'],
                    ['Metilcelulosa', '0.5 – 2.0', 'Gela en caliente, funde en frío (inverso).'],
                  ].map(([agente, prop, funcion]) => (
                    <tr key={agente}>
                      <td className="px-6 py-4 font-normal text-on-surface">{agente}</td>
                      <td className="px-6 py-4 text-center">{prop}</td>
                      <td className="px-6 py-4">{funcion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sección 4 */}
          <section>
            <h2 className="mb-6 flex items-center gap-4 font-headline text-3xl font-light tracking-tight text-secondary">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-secondary/20 bg-secondary/5 font-label text-sm text-secondary">04</span>
              Esferificación e Ingeniería de Membrana
            </h2>
            <p className="mb-4 leading-relaxed text-on-surface-variant">
              Proceso de encapsulación mediante reticulación iónica. El caso de la{' '}
              <strong className="text-on-surface">Aceituna Esférica (Adrià)</strong> es nuestro estándar de oro.
            </p>
            <h3 className="mb-3 font-label text-xs uppercase tracking-widest text-on-surface">Protocolo de Hidratación</h3>
            <p className="leading-relaxed text-on-surface-variant">
              Reposo estricto de <strong className="text-on-surface">24 horas</strong> para mezclas de alginato — hidratación
              total del polímero y eliminación de microburbujas garantizada. Las esferas terminadas se conservan en{' '}
              <em>aceite aromatizado</em> para prevenir deshidratación osmótica.
            </p>
          </section>

          {/* Sección 5 */}
          <section>
            <h2 className="mb-6 flex items-center gap-4 font-headline text-3xl font-light tracking-tight text-secondary">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-secondary/20 bg-secondary/5 font-label text-sm text-secondary">05</span>
              Estándares Michelin y Emplatado
            </h2>
            <p className="mb-6 leading-relaxed text-on-surface-variant">
              La operatividad diaria se rige por los <strong className="text-on-surface">Criterios de 1936</strong>: calidad de
              ingredientes, dominio técnico, personalidad del chef, armonía de sabores y consistencia matemática.
            </p>
            <div className="border-l-2 border-secondary/20 pl-8 italic text-on-surface-variant">
              &ldquo;La búsqueda de la estrella es un compromiso unánime con la perfección absoluta.&rdquo;
            </div>
          </section>

        </div>

        {/* CTA hacia recetas */}
        <div className="mt-24 flex items-center justify-center">
          <Link href="/recipes/recetas" className="group flex flex-col items-center gap-6">
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-secondary/30 to-transparent" />
            <div className="relative">
              <div className="absolute inset-0 -m-8 animate-pulse rounded-full bg-secondary/5 blur-2xl" />
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-secondary/20 bg-secondary/5 transition-all duration-500 group-hover:scale-110 group-hover:border-secondary/40">
                <AppIcon
                  name="arrow_forward"
                  size={24}
                  className="text-secondary transition-transform duration-500 group-hover:translate-x-1"
                />
              </div>
            </div>
            <div className="text-center">
              <p className="font-label text-[10px] uppercase tracking-[0.4em] text-secondary">
                Protocolo interiorizado
              </p>
              <p className="mt-2 font-headline text-3xl font-light text-on-surface transition-colors group-hover:text-secondary">
                Acceder al <span className="font-normal italic">Recetario Maestro</span>
              </p>
            </div>
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-secondary/30 to-transparent" />
          </Link>
        </div>
      </div>
    </div>
  );
}
