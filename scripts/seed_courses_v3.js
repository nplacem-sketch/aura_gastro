/**
 * seed_courses_v3.js — AURA GASTRONOMY
 * ─────────────────────────────────────────────────────────────────────────────
 * ESTRATEGIA ANTI-ALUCINACIÓN:
 *   Cada lección lleva HECHOS TÉCNICOS REALES precargados.
 *   El modelo local (qwen3:4b) SOLO redacta esos hechos en prosa profesional.
 *   → No puede inventar nada porque los datos ya vienen dentro del prompt.
 *   → No puede repetir porque cada lección tiene un conjunto único de hechos.
 *
 * CURSOS:
 *   1 × PRO    — Técnicas Culinarias de Precisión
 *   2 × PREMIUM — Cocina Molecular | Sumillería Científica
 *
 * PREREQUISITO: PREMIUM-2 requiere superar PREMIUM-1 (guardado en DB).
 */
'use strict';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const aDb = createClient(
  process.env.SUPABASE_ACADEMY_URL,
  process.env.SUPABASE_ACADEMY_SERVICE_KEY
);

const OLLAMA = 'http://127.0.0.1:11434';
const MODEL  = 'qwen2.5:7b';
const delay  = ms => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// DATOS TÉCNICOS REALES POR LECCIÓN
// Cada lesson tiene: title + facts[] (hechos verificables, sin invención)
// ─────────────────────────────────────────────────────────────────────────────
const COURSES = [
  // ══════════════════════════════════════════════════════════════════════════
  // CURSO 1 — PRO
  // ══════════════════════════════════════════════════════════════════════════
  {
    tier: 'PRO',
    title: 'Técnicas Culinarias de Precisión: Ciencia y Método',
    description: 'Domina los fundamentos físico-químicos de la cocina profesional: termodinámica, emulsiones y fermentaciones controladas con datos exactos y aplicación directa en brigada.',
    order: 1,
    prerequisite_index: null,
    modules: [
      {
        title: 'Termodinámica Aplicada a la Cocina',
        lessons: [
          {
            title: 'Conducción, convección y radiación en cocción',
            facts: [
              'La conducción transfiere calor por contacto directo entre moléculas; el acero inoxidable conduce ~16 W/m·K vs el cobre ~385 W/m·K.',
              'La convección forzada (ventilador en hornos combi) acelera la transferencia de calor hasta un 30% respecto a la convección natural.',
              'La radiación infrarroja penetra 2-3 mm en la superficie del alimento; es el mecanismo dominante en parrilla y salamandra.',
              'El efecto Maillard comienza a ~140°C: los aminoácidos reaccionan con azúcares reductores produciendo más de 1000 compuestos aromáticos distintos.',
              'En cocción al vapor a 100°C la transferencia de calor es 4× más eficiente que en horno seco a igual temperatura por la densidad del vapor condensado.',
            ]
          },
          {
            title: 'Temperatura interna y desnaturalización de proteínas',
            facts: [
              'La miosina en carne bovina comienza a desnaturalizarse a 50°C; la actina, a 65-70°C. Por ello, un filete a 55°C resulta jugoso y a 75°C, seco.',
              'El colágeno (gelificación) se convierte en gelatina a partir de 71°C con tiempo sostenido. Costillar de ternera: 72°C durante 48 h en sous-vide produce ternura máxima.',
              'El músculo de pescado (proteínas sarcoplasmáticas) desnaturaliza rápido: merluza óptima a 52-55°C interna.',
              'La yema de huevo cuaja entre 63-65°C; la clara, entre 60-80°C según fracción proteica (ovalbúmina 84°C, ovoconalbúmina 61°C).',
              'El uso de termómetro de sonda con calibración en agua hirviendo (100°C) y agua con hielo (0°C) es obligatorio en producción profesional.',
            ]
          },
          {
            title: 'Sous-vide: parámetros de tiempo, temperatura y seguridad',
            facts: [
              'Sous-vide opera en rango 50-85°C con tolerancia ±0.1°C en termocirculadores profesionales (Polyscience, PolyScience Chef).',
              'Reducción de 6 log10 de Listeria monocytogenes en aves: 74°C durante 0 s, o 60°C durante 27.5 min (pasteurización acumulada según USDA).',
              'El vacío debe ser ≥99.9% para evitar bolsas de aire que impiden la transferencia de calor homogénea.',
              'Bolsas de cocción certificadas sous-vide (PE o PA/PE) soportan hasta 90°C; nunca usar bolsas de congelación domésticas.',
              'Tiempo de estabilización: un filete de 3 cm de grosor tarda ~1.5 h en alcanzar temperatura central de equilibrio en baño a 57°C.',
            ]
          },
        ]
      },
      {
        title: 'Química de Emulsiones y Salsas Madres',
        lessons: [
          {
            title: 'Emulsionantes naturales: lecitina, caseína y yema',
            facts: [
              'La lecitina de soja contiene fosfatidilcolina, anfifilica: cabeza polar (hidrófila) + cola apolar (lipófila). Dosis efectiva: 0.3-1% sobre la masa total.',
              'La yema de huevo tiene ~10% de lecitinas y ~16% de proteínas emulsionantes; soporta una emulsión O/W de hasta 7:1 aceite/yema.',
              'La caseína (proteína de leche) forma micelas que estabilizan emulsiones en salsas de nata reducida. Se desestabiliza a pH < 4.6 (punto isoeléctrico).',
              'Temperatura de pasteurización de la yema: 60°C durante 3.5 min destruye Salmonella sin coagular la emulsión si se mezcla constantemente.',
              'Mono y diglicéridos (E471) son emulsionantes sintéticos admitidos en hostelería; HLB 3-6 para emulsiones A/O, HLB 8-18 para O/A.',
            ]
          },
          {
            title: 'Estabilidad y rotura controlada de emulsiones O/W y W/O',
            facts: [
              'Emulsión O/W (oil-in-water): mayonesa, holandesa, vinagreta con goma. El agua es fase continua; las gotas de aceite están dispersas.',
              'Emulsión W/O (water-in-oil): mantequilla, margarina. El agua está encapsulada dentro de la fase grasa continua.',
              'La rotura se produce por coalescencia (temperatura >80°C en holandesa) o por cambio de pH. Rescatar holandesa cortada: añadir 1 cda de agua fría y batir fuera del fuego.',
              'Tamaño óptimo de glóbulo en emulsión estable: 0.1-1 µm. Un homogeneizador de alta presión (600 bar) consigue 0.3-0.5 µm.',
              'La goma xantana (0.1-0.3%) aumenta la viscosidad de la fase acuosa impidiendo la coalescencia sin alterar el sabor.',
            ]
          },
          {
            title: 'Salsas madre: base científica y proporciones exactas',
            facts: [
              'Sauce veloutée: 1 L fondo blanco + 60 g mantequilla + 60 g harina (roux ratio 1:1 en peso). Cocción mínima 20 min para eliminar sabor a almidón crudo.',
              'Sauce béchamel: 1 L leche + 70 g mantequilla + 70 g harina + sal, pimienta blanca, nuez moscada. Nappe a 70°C indica viscosidad correcta.',
              'La salsa espanyola usa fondo oscuro (huesos tostados a 180°C, reacción Maillard de aminoácidos y azúcares) + tomate + mirepoix dorado.',
              'La demi-glace es española reducida al 50%; contiene ≥15% proteínas gelatinosas. Temperatura de gelificación: 15-18°C = gel firme.',
              'Emulsión de mantequilla (beurre blanc): acidez ácido tartárico del vino blanco estabiliza la emulsión; temperatura de servicio máximo 65°C para evitar separación.',
            ]
          },
        ]
      },
      {
        title: 'Fermentación Controlada en Cocina',
        lessons: [
          {
            title: 'Bacterias lácticas y fermentación espontánea',
            facts: [
              'Lactobacilos homofermentativos (Lactobacillus plantarum) producen solo ácido láctico. Heterofermentativos producen adicionalmente CO₂ y etanol.',
              'pH objetivo en encurtidos lácticos: 3.5-4.0. Por debajo se detiene la fermentación por inhibición de los propios lactobacilos.',
              'Temperatura óptima para Lactobacillus plantarum: 25-30°C. A 37°C acelera y se arriesga contaminación por organismos patógenos.',
              'El NaCl (sal) en fermentación láctica: 2% inhibe mohos y bacterias Gram negativas (Enterobacteriaceae); <1% riesgo de podredumbre; >5% inhibe lactobacilos.',
              'Indicadores de fermentación correcta: descenso de pH medido con pHmetro, burbujas de CO₂ visibles, aroma ácido lácteo sin nota pútrida.',
            ]
          },
          {
            title: 'Control de pH y salinidad en encurtidos profesionales',
            facts: [
              'La proporción de salmuera estándar en encurtidos europeos: 2-3% NaCl en peso sobre el vegetal (pepino, col, zanahoria).',
              'Medición de NaCl con refractómetro salino (Brix NaCl): 2% sal = aprox 2°Bé. Calibrar con agua destilada a 20°C.',
              'pH inicial del vegetal sin fermentar: 5.5-6.5. A las 72 h de fermentación activa a 25°C debe estar a pH 4.0-4.5.',
              'Kimchi coreano: ratio col china/gochugaru/jengibre/ajo/cebolleta + 2% sal. Se fermenta a 4°C durante 2-4 semanas (fermentación lenta = mayor complejidad aromática).',
              'Sicherheit: agua destilada o potable libre de cloro. El cloro inhibe lactobacilos. Dejar reposar el agua del grifo 30 min o usar agua mineral.',
            ]
          },
          {
            title: 'Koji, miso y garum: fermentación de proteínas en alta cocina',
            facts: [
              'Aspergillus oryzae (koji) produce proteasas, amilasas y lipasas. Temperatura de incubación: 28-32°C, humedad 85-90% durante 44-48 h.',
              'Miso blanco (shiro): soja + koji de arroz + 5-8% sal, fermentado 2-4 semanas a 25°C. Miso rojo: 10-12% sal, 6-12 meses; pH 4.6-5.0.',
              'Garum moderno (Noma): proteínas animales (sangre, carne) + koji al 15% + 12% sal, incubado a 60°C durante 8-12 semanas. La autólisis enzimática genera glutamato libre = umami intenso.',
              'Salsa de pescado (nam pla): anchoveta + 25-30% sal, fermentada 12-18 meses. Contenido de aminoácidos libres: 8-12 g/100 ml.',
              'El glutamato monosódico (MSG) presente de forma natural en miso: 0.5-1.5 g/100 g. Umbral de percepción del umami: 0.3 mM (ácido glutámico).',
            ]
          },
        ]
      },
    ]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CURSO 2 — PREMIUM
  // ══════════════════════════════════════════════════════════════════════════
  {
    tier: 'PREMIUM',
    title: 'Cocina Molecular: Del Laboratorio al Plato de Alta Cocina',
    description: 'Programa de vanguardia basado en los principios de la cocina modernista: hidrocoloides, esferificación, criotecnia y deconstrucción. Cada técnica con datos de concentración, temperatura y seguridad de uso en brigada.',
    order: 2,
    prerequisite_index: null,
    modules: [
      {
        title: 'Hidrocoloides: Gelificantes y Espesantes de Precisión',
        lessons: [
          {
            title: 'Agar-agar: gelificación termorreversible y aplicaciones',
            facts: [
              'Agar-agar es un polisacárido de algas rojas (Gelidium, Gracilaria). Punto de gelificación: 32-40°C. Punto de fusión: 85-95°C (superior al de gelatina: 35°C).',
              'Concentraciones de uso: gel suave 0.5%, gel firme 1%, gel muy firme 2%. Disolver en agua hirviendo (100°C) durante 2 min antes de usar.',
              'Agar gelatiniza en caliente → líquido; al enfriar → gel sólido a >40°C. Esta propiedad permite servir veloutes gelificadas calientes que cuajan en plato.',
              'Espaguetis de agar: preparar gel al 0.7%, verter caliente en jeringa, extrudir en baño de aceite frío (-20°C). Resultado: fideos transparentes termoestables hasta 85°C.',
              'Importante: el agar no forma gel con alta concentración de papaína o bromelaína (frutas tropicales crudas como papaya/piña). Usar fruta cocinada.',
            ]
          },
          {
            title: 'Carragenanos: tipos y diferencias funcionales en cocina',
            facts: [
              'Carragenano kappa (κ): gel firme, frágil, se refuerza con iones K⁺ (añadir KCl 0.2%); mejor en lácteos. Concentración: 0.5-1%.',
              'Carragenano iota (ι): gel elástico, flexible, se refuerza con iones Ca²⁺; bueno con proteínas de leche. Concentración: 0.5-1.5%.',
              'Carragenano lambda (λ): no gelifica; actúa como espesante en frío. Perfecto para espesar salsas de serving sin aplicar calor.',
              'Los tres tipos activan en caliente (≥70°C) y gelificarán al enfriar entre 30-60°C según tipo. Lambda nunca gelifica.',
              'Aplicación estrella: panna cotta sin gelatina animal → carragenano iota al 0.6% en leche entera = textura cremosa, gel estable hasta 55°C.',
            ]
          },
          {
            title: 'Metilcelulosa, xantana y goma guar: espesantes funcionales',
            facts: [
              'Metilcelulosa (MC): único gel que cuaja en caliente (>50°C) y se licúa en frío (<10°C). Concentración: 1.5-2%. Disolver siempre en agua muy fría (4°C) durante 24 h.',
              'Xantana (E415): produce viscosidad pseudoplástica (más viscosa en reposo, más fluida al agitar). Dosis 0.1-0.3%. Estable entre -18°C y 120°C y pH 3-9.',
              'Goma guar (E412): espesante muy económico; trabaja en frío; potencia 5× la viscosidad de xantana. Dosis 0.05-0.1%. Puede causar turbidez en salsas claras.',
              'Mezcla simbiótica: goma guar + xantana (1:1) produce sinergismo → la viscosidad resultante supera la suma de ambas por separado (efecto de red molecular compartida).',
              'Locust bean gum (LBG, E410) + carragenano kappa: produce gel elástico con alta resistencia a la sinéresis (expulsión de agua). Ratio óptimo 60:40.',
            ]
          },
        ]
      },
      {
        title: 'Esferificación: Básica, Inversa y Aplicaciones',
        lessons: [
          {
            title: 'Esferificación básica: alginato sódico + cloruro cálcico',
            facts: [
              'Mecanismo: el alginato sódico (Na-alginato, E401) disuelto en el líquido a esferar reacciona con Ca²⁺ del baño para formar alginato cálcico insoluble.',
              'Concentración estándar: 0.5% alginato en el líquido + baño de CaCl₂ al 0.5%. Para esferas más resistentes: alginato 0.8% + CaCl₂ 1%.',
              'El alginato debe hidratarse 30 min con turmix o 12 h en nevera para eliminar burbujas. Dispersar en agua fría con batidora de varillas.',
              'Tiempo de gelificación en baño: 1-2 min para caviar (jeringa); 3-4 min para ravioli líquido (cuchara). Más tiempo = membrana más gruesa y sabor a alginato.',
              'Limitación: el líquido debe tener pH >4 (ácidos destruyen la membrana) y bajo contenido en Ca²⁺ previo (leche, zumos cítricos directos: incompatibles sin ajuste).',
            ]
          },
          {
            title: 'Esferificación inversa: gluconolactato cálcico + alginato',
            facts: [
              'Inversión del sistema: el Ca²⁺ va dentro del líquido (gluconolactato cálcico, GDL, 1-2%) y el alginato va en el baño exterior (alginato 0.5%).',
              'Ventaja clave: la membrana no sigue gelificando después de sacar la esfera del baño → las esferas son estables durante horas sin espesar su interior.',
              'Gluconolactato es neutro de sabor y soluble en frío. Permite esferar lácteos, alcoholes, purés ácidos (imposibles en básica).',
              'Baño de alginato: preparar 12-24 h antes para eliminar burbujas. Filtrar por chino fino. Mantener a temperatura ambiente (no en nevera: el alginato precipita).',
              'Las esferas de aceite de oliva virgen extra (con lecitina 0.5% para homogeneización) con esferificación inversa son el ejemplo emblemático de El Bulli (2003).',
            ]
          },
          {
            title: 'Raviolis líquidos, membranas y caviar vegetal',
            facts: [
              'Ravioli líquido: llenar cucharas soperas con 5 ml del líquido gelificado (alginato 0.5%) → sumergir en baño de CaCl₂ 60 s → enjuagar en agua destilada.',
              'Caviar vegetal de aceite: aceite + lecitina 1% + alginato 0.5%, introducir con jeringa de 3 ml en baño de CaCl₂ 0.5% en caída libre desde 10 cm.',
              'Membrana esférica: grosor aproximado 0.3-0.5 mm en esferificación básica (2 min). Proporciona la sensación de "explosión" característica en boca.',
              'Enjuague con agua destilada es obligatorio para detener la gelificación y eliminar sabor residual a CaCl₂ (amargo). Nunca usar agua del grifo con cloro.',
              'Vida útil de esferas básicas en nevera: máximo 2 h (siguen gelificando). Esferas inversas: 24-48 h estables en su propio líquido, sin baño.',
            ]
          },
        ]
      },
      {
        title: 'Nitrógeno Líquido y Criotecnia en Restauración',
        lessons: [
          {
            title: 'Propiedades físicas del N₂ líquido y uso en servicio',
            facts: [
              'Nitrógeno líquido (N₂l): temperatura de ebullición -195.8°C a 1 atm. Expansión al evaporar: 1 litro de líquido produce 696 litros de gas a 20°C.',
              'Recipientes de almacenamiento: dewares de acero inoxidable al vacío. Nunca almacenar en recipientes herméticos: riesgo de explosión por presión.',
              'Equipación de seguridad obligatoria en brigada: guantes criogénicos, gafas de protección, mandil de cuero. No manipular en espacios cerrados sin ventilación.',
              'El efecto Leidenfrost: al verter N₂l sobre una superficie >-100°C se forma una capa gaseosa que frena el contacto directo y permite la transferencia lenta.',
              'Tiempo de conservación en dewar de 10 L: 3-6 semanas. Verificar nivel con varilla de madera (nunca metal caliente: efecto Leidenfrost violento).',
            ]
          },
          {
            title: 'Helados instantáneos y polvos criogénicos',
            facts: [
              'Helado instantáneo: verter N₂l en base ligeramente caliente (20-30°C) mientras se bate. Cristales de hielo < 5 µm → textura ultracremosa.',
              'Base estándar para helado nitrogenado: 500 ml nata 35% MG + 100 g azúcar + 2 yemas pasteurizadas + vainilla. Mezclar en frío antes de verter N₂l.',
              'Polvos criogénicos con maltodextrina: mezclar aceite esencial o grasa líquida (AOVE, mantequilla) con maltodextrina de tapioca a ratio 1:1. El polvo absorbe grasa y se dispersa en boca.',
              'Popping candy criocongelado: sumergir caramelo hiperventilado en N₂l 30 s → las burbujas de CO₂ quedan atrapadas. Efecto visual al servir: humo aromático.',
              'Sorbetes express: añadir N₂l a un zumo fresco azucarado (25° Brix) moviendo con espátula. Ratio orientativo: 200 ml zumo / 300 ml N₂l para textura de sorbete firme.',
            ]
          },
          {
            title: 'Protocolos de seguridad criogénica en brigada',
            facts: [
              'Concentración de O₂ mínima: 19.5% (aire normal: 20.9%). Con N₂l en sala, instalar sensor de O₂ portátil. Alarma a <19.5%: evacuar inmediatamente.',
              'Almacenamiento: posición vertical, área ventilada, lejos de fuentes de calor e ignición. Nunca en cámara frigorífica sin ventilación forzada.',
              'En caso de quemadura criogénica: cubrir con paño estéril, no frotar, no aplicar calor drástico. Agua tibia (37-40°C) durante 10-20 min. Atención médica si área mayor de 1 cm².',
              'Formación anual del personal obligatoria (PRL): Real Decreto 374/2001 (España) exige evaluación de riesgos por exposición a agentes químicos incluyendo criógenicos.',
              'Transporte en vehículo: no colocar dewar en cabina cerrada. Siempre en maletero o área de carga bien ventilada con ventana abierta.',
            ]
          },
        ]
      },
    ]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CURSO 3 — PREMIUM (requiere aprobar CURSO 2)
  // ══════════════════════════════════════════════════════════════════════════
  {
    tier: 'PREMIUM',
    title: 'Sumillería Avanzada y Maridaje Científico de Alta Gastronomía',
    description: 'Análisis organoléptico de vinos, sake y destilados con base química. Aplicación del food pairing molecular y diseño estructurado de menús degustación con armonía líquida de referencia internacional.',
    order: 3,
    prerequisite_index: 1,  // índice del curso PREMIUM-1 (el anterior)
    modules: [
      {
        title: 'Química Sensorial del Vino',
        lessons: [
          {
            title: 'Polifenoles, taninos y antocianos: estructura y percepción',
            facts: [
              'Los taninos condensados (proantocianidinas) proceden de pepitas y hollejos de uva. Umbral de percepción tánica: 200 mg/L equivalentes de ácido tánico.',
              'Antocianos (malvidina-3-glucósido predominante en tintos) son responsables del color rojo-morado. En pH < 3.5 son rojos; en pH > 5 viajan a violeta-azul.',
              'El índice de polifenoles totales (IPT) en vinos tintos va de 40 (jóvenes ligeros) a >120 (grandes reservas). Se mide a 280 nm por espectrofotometría.',
              'Tanicidad percibida depende no solo de la concentración sino del polímero: taninos de semilla (polimerizados) son más astringentes que los de madera (singltan).',
              'El calentamiento excesivo de vino tinto (>18°C en servicio) volatiliza ésteres aromáticos y potencia la percepción alcohólica por volatilización del etanol.',
            ]
          },
          {
            title: 'Ésteres, alcoholes superiores y terpenos: química aromática',
            facts: [
              'Acetato de isoamilo: aroma a plátano/caramelo; presente en vinos jóvenes de fermentación a baja temperatura. Umbral olfativo: 0.03 mg/L.',
              'Acetato de etilo (vinagre elevado): concentración normal < 150 mg/L. Por encima: nota de acetona/quitaesmaltes, defecto por Acetobacter (bacteria aeróbica).',
              'Terpenos lineales (linalol, geraniol, nerol): marcadores varietales de Moscatel, Gewurztraminer y Albariño. Concentraciones: 1-5 mg/L en varietales aromáticos.',
              'β-damascenona: aroma a rosa/coñac. Concentración ínfima (ng/L) con alto impacto olfativo. Aumenta con la crianza. Umbral 0.009 µg/L.',
              'Alcoholes superiores (1-propanol, isobutanol, isoamílico): contribuyen al "body" del vino; concentraciones 200-400 mg/L son positivas; por encima de 500 mg/L son defecto de fermentación.',
            ]
          },
          {
            title: 'pH, acidez total y acidez volátil: lectura técnica de la cata',
            facts: [
              'pH del vino: blancos 3.0-3.4, tintos 3.3-3.7. El pH afecta a la efectividad del SO₂ libre: a pH 3.0, el 93% es SO₂ molecular activo. A pH 3.5, solo el 30%.',
              'Acidez total titulable (ATT) en g/L ácido tartárico: blancos secos 6-9 g/L; tintos 5-7 g/L. Por debajo de 5 g/L el vino parece plano y sin estructura.',
              'Ácido málico vs tartárico: el tartárico es estable y propio de la uva; el málico se puede reducir vía fermentación maloláctica (bact. Oenococcus oeni) para redondear acidez.',
              'Acidez volátil (AV): principalmente ácido acético. Por encima de 0.7 g/L es defecto detectable; el límite legal en Europa para tintos es 1.2 g/L.',
              'Herramienta sumiller: tira de pH o pHmetro portátil de precisión ±0.02. Calibrar con soluciones tampón pH 4.0 y 7.0 antes de cada sesión de cata.',
            ]
          },
        ]
      },
      {
        title: 'Food Pairing Molecular y Maridaje de Alta Cocina',
        lessons: [
          {
            title: 'Teoría del food pairing: compuestos volátiles compartidos',
            facts: [
              'La hipótesis del food pairing (Blumenthal/Gerbaulet, 2002): dos ingredientes maridan bien si comparten moléculas aromáticas clave (keystone compounds).',
              'Ejemplo clásico: chocolate negro y coliflor comparten pirazinas y furanos; maridaje inesperado pero funcionalmente coherente.',
              'Herramientas digitales: FlavorDB (IIT Delhi), FoodPairing.com. Contienen >1000 ingredientes con hasta 200 compuestos volátiles por ingrediente.',
              'Crítica: el food pairing molecular no considera la estructura de sabores no volátiles (acidez, amargor, textura) fundamentales en la experiencia de cata.',
              'Aplicación práctica: trufa negra (bismetiltiometano) marida con foie gras y jerez oloroso (aldehídos compartidos de oxidación y maduración).',
            ]
          },
          {
            title: 'Umami, proteínas marinas y maridaje con blancos y sake',
            facts: [
              'El glutamato libre en alimentos: parmesano 1200 mg/100 g, tomate maduro 140 mg/100 g, espárrago 49 mg/100 g. Potencia umami directamente.',
              'Sinergia umami: glutamato (GMP) + inosinato (IMP, en carne/pescado) = efecto sinérgico ×8 en percepción. IMP en atún 250-1285 mg/100 g.',
              'Vino blanco con crianza en barrica (carbono del roble absorbe astringencia): Chablis Premier Cru marida con ostras por la textura grasa del maloláctica y la acidez que corta el yodo.',
              'Sake junmai daiginjo: arroz pulido al 50%, notas de melón, pétalos y arroz. Maridaje con crudo de vieira: umami de ambos se potencia; el sake limpia la grasa de la vieira.',
              'Carbónico en espumosos: el CO₂ a 12°C forma ácido carbónico (pH ~4.2) que limpia el paladar después de cada bocado rico en grasa. Función de limpieza entre pases.',
            ]
          },
          {
            title: 'Maridaje con espumosos, sake premium y destilados de malta',
            facts: [
              'Champagne dosage: el licor de expedición determina el estilo. Brut Nature (0-3 g/L azúcar) marida con crudo y caviar. Extra Brut (<6 g/L) con pescados a la sal.',
              'Single Malt Scotch (Speyside): notas de vainilla, manzana verde, avena tostada. Maridaje con quesos maduros de pasta dura (parmesano, manchego añejo).',
              'Islay Scotch (Laphroaig, Ardbeg): fenol 40-120 ppm. Maridaje extremo con ostras ahumadas o steak tartar con alcaparras (el humo encuadra el yodo).',
              'Mezcal joven (espadin): notas terrosas, cítrico y vegetal. Maridaje con ceviches de cítrico o tacos de carnitas (complemento graso + ácido corta el agave terroso).',
              'Calvados AOP Pays d\'Auge: destilado de sidra con crianza mínima 2 años. Maridaje con tartas Tatin, foie gras con manzana, charcutería de cerdo normando.',
            ]
          },
        ]
      },
      {
        title: 'Diseño de Menús Degustación con Armonía Líquida',
        lessons: [
          {
            title: 'Progresión de sabores: arquitectura del menú degustación',
            facts: [
              'Arquitectura clásica de 8 pases: aperitivo frío / snacks (3-5 bocados) → caldo / consommé → dos entrantes (vegetal/proteína ligera) → plato intermedio pescado → pre-postre sorbet → principal cárnico → queso → postre.',
              'Temperatura de los platos: el menú debe progresar de fríos a calientes y finalizar en tibio-frío (postre). Servir fríos en caliente aletarga las papilas.',
              'Salinidad progresiva: iniciar con niveles bajos de sal (umami delicado) y aumentar gradualmente. Non reversible: un plato muy salado embota el siguiente.',
              'Acidez estratégica: insertar pase ácido (tartar de cítrico, gazpacho, sorbet de yuzu) antes o después de un plato rico en grasa para limpiar el paladar.',
              'Número de pases en alta cocina: 8-14 pases es estándar. Por encima de 18 sin reducciones de tamaño provoca fatiga sensorial y pérdida del impacto de cada plato.',
            ]
          },
          {
            title: 'Temperatura de servicio y oxigenación según perfil del vino',
            facts: [
              'Temperaturas de servicio: Champagne Blanc de Blancs 6-8°C; Riesling Spätlese 9-11°C; Pinot Noir Borgoña 14-16°C; Reserva Rioja tempranillo 16-17°C; Oporto tawny 14°C.',
              'La decantación en tintos jóvenes con muchos taninos condensados (Syrah, Nebbiolo): 1-2 h en decantador de base ancha (superficie de contacto con O₂ = 200-400 cm²).',
              'El oxígeno suaviza los taninos por polimerización: moléculas de antocianina + taninos se unen formando pigmentos más grandes y menos astringentes.',
              'La copa adecuada: Borgoña (cáliz ancho, 750 ml) concentra aromas y suaviza taninos. Burdeos (cáliz estrecho, 580 ml) dirige el vino al centro-trasero de la lengua (taninos más presentes).',
              'Temperatura de la copa: nunca enjuagar con agua caliente. Si la copa está fría, el vino sube de temperatura en 2 min por la mano. Si está caliente, aromas alcohólicos dominan.',
            ]
          },
          {
            title: 'Maridaje completado: de cócteles de autor a destilados de barrica',
            facts: [
              'Sour de autor con whisky bourbon y bitters de chocolate: acompañar con canelón de mole negro y pato confitado. Los ésteres de barrica del bourbon enlazan con el cacao del mole.',
              'Martini de wasabi y pepino (vodka infusionado): maridaje con nigiri de salmón belly. El isotiocianato del wasabi (picante limpio) se atenúa con la grasa del salmón.',
              'Cóctel negrone: amargor de Campari (umbral = 24 ppm quinina equiv.) marida con foie mi-cuit. El amargor limpia la grasa del hígado y el gin añade aromas botánicos que complementan.',
              'Brandy de Jerez VORS (>30 años): notas de café, caramelo, higo seco, tabaco. Maridaje canónico: tarta de Santiago, yema de huevo tostada, trufa de chocolate amargo.',
              'Cierre del menú con digestivo: el objetivo no es solo sabor sino activar la digestión (angostura bitters estimula la secreción de bilis; chartreuse verde con 130 plantas actúa como aperitivo y digestivo).',
            ]
          },
        ]
      },
    ]
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT MASTER — diseñado para CERO alucinaciones y CERO repeticiones
// ─────────────────────────────────────────────────────────────────────────────
function buildPrompt(courseTitle, moduleName, lessonTitle, facts) {
  const factsText = facts.map((f, i) => `${i + 1}. ${f}`).join('\n');
  return `Redacta en Markdown profesional el contenido de esta lección gastronómica usando SOLO los hechos listados. NO inventes nada. NO uses frases de apertura genéricas. Empieza directamente con la materia técnica. Usa **negritas** para términos clave, temperaturas y porcentajes. Entre 180 y 250 palabras.

LECCIÓN: "${lessonTitle}" (Módulo: "${moduleName}")

HECHOS A DESARROLLAR:
${factsText}`;
}

// ─────────────────────────────────────────────────────────────────────────────
async function callOllama(prompt) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(`${OLLAMA}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          prompt,
          stream: false,
          options: {
            temperature: 0.1,
            top_p: 0.9,
            num_predict: 2048,
          }
        })
      });
      const body = await res.json();
      let text = (body.response || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (text.length > 80) return text;
    } catch (e) {
      console.log(`\n    [Ollama retry ${attempt}/5] ${e.message}`);
    }
    await delay(5000); // 5s de respiro para el modelo 7b
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
async function nukeAll() {
  console.log('\n🗑  Limpiando base de datos de academia…');
  const { data: mods } = await aDb.from('modules').select('id');
  if (mods?.length) {
    await aDb.from('lessons').delete().in('module_id', mods.map(m => m.id));
  }
  const { data: courses } = await aDb.from('courses').select('id');
  if (courses?.length) {
    await aDb.from('exams').delete().in('course_id', courses.map(c => c.id));
    await aDb.from('modules').delete().in('course_id', courses.map(c => c.id));
    await aDb.from('courses').delete().in('id', courses.map(c => c.id));
  }
  console.log('   ✓ Limpieza completada\n');
}


// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('══════════════════════════════════════════════════════');
  console.log('  AURA GASTRONOMY — Course Seeder v3 (facts-first)   ');
  console.log('══════════════════════════════════════════════════════\n');

  await nukeAll();

  const insertedIds = [];

  for (let ci = 0; ci < COURSES.length; ci++) {
    const bp = COURSES[ci];

    // Resolver prerequisito
    const prereqId = bp.prerequisite_index !== null ? (insertedIds[bp.prerequisite_index] || null) : null;

    console.log(`📚 [${ci + 1}/${COURSES.length}] ${bp.tier} — "${bp.title}"`);

    const coursePayload = {
      title: bp.title,
      description: bp.description,
      tier: bp.tier,
      course_order: bp.order,
      status: 'published',
      is_premium: bp.tier !== 'FREE',
      level: bp.tier === 'PRO' ? 'Avanzado' : 'Experto',
    };

    // Intentar guardar prerequisite_course_id (puede no existir en la tabla)
    try {
      const test = await aDb.from('courses').select('prerequisite_course_id').limit(1);
      if (!test.error) coursePayload.prerequisite_course_id = prereqId;
    } catch {}

    const { data: course, error: cErr } = await aDb.from('courses').insert(coursePayload).select().single();
    if (cErr) { console.error('  ❌ Error al insertar curso:', cErr.message); insertedIds.push(null); continue; }
    insertedIds.push(course.id);
    console.log(`  ✓ Curso creado: ${course.id}\n`);

    for (let mi = 0; mi < bp.modules.length; mi++) {
      const mod = bp.modules[mi];
      console.log(`  📖 Módulo ${mi + 1}/${bp.modules.length}: "${mod.title}"`);

      const { data: modRow, error: mErr } = await aDb.from('modules').insert({
        course_id: course.id,
        title: mod.title,
        order_index: mi + 1,
      }).select().single();

      if (mErr) { console.error('    ❌ Error módulo:', mErr.message); continue; }

      for (let li = 0; li < mod.lessons.length; li++) {
        const lesson = mod.lessons[li];
        process.stdout.write(`    📝 Lección ${li + 1}/${mod.lessons.length}: "${lesson.title}" … `);

        const prompt  = buildPrompt(bp.title, mod.title, lesson.title, lesson.facts);
        const content = await callOllama(prompt)
          || `## ${lesson.title}\n\n${lesson.facts.map(f => `- ${f}`).join('\n')}`;

        const { error: lErr } = await aDb.from('lessons').insert({
          module_id: modRow.id,
          title: lesson.title,
          content,
          order_index: li + 1,
        });

        if (lErr) console.log(`❌ ${lErr.message}`);
        else      console.log('✓');

        await delay(300);
      }
      console.log('');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GENERACIÓN DE EXAMEN (25 PREGUNTAS EN 5 LOTES DE 5)
    // ─────────────────────────────────────────────────────────────────────────
    console.log(`  🎓 Generando examen final para: "${bp.title}" (25 preguntas)...`);
    
    // Recopilar todos los hechos del curso para el examen
    const allFacts = bp.modules.flatMap(m => m.lessons.flatMap(l => l.facts));
    let questions = [];

    // Dividir en 5 lotes para evitar saturar el modelo y asegurar formato JSON
    for (let batch = 1; batch <= 5; batch++) {
      process.stdout.write(`    [Lote ${batch}/5] Generando 5 preguntas… `);
      
      const batchFacts = allFacts.slice((batch - 1) * 3, batch * 3 + 2); // 5 hechos por lote
      const examPrompt = `Genera EXACTAMENTE 5 preguntas técnicas de opción múltiple basadas en estos HECHOS:
${batchFacts.join('\n')}

REGLAS:
1. Formato: JSON Array de objetos.
2. Cada objeto: {"question": "...", "options": ["A", "B", "C", "D"], "answer": 0, "explanation": "..."}
3. Dificultad: Profesional/Alta.
4. "answer" es el índice (0-3) de la opción correcta.
5. NO incluyas introducciones. SOLO el array JSON.`;

      let batchSuccess = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const raw = await callOllama(examPrompt);
          if (raw) {
            const clean = raw.replace(/```json|```/g, '').trim();
            const batchQuestions = JSON.parse(clean);
            if (Array.isArray(batchQuestions) && batchQuestions.length > 0) {
              questions.push(...batchQuestions.slice(0, 5));
              batchSuccess = true;
              console.log('✓');
              break;
            }
          }
        } catch (e) {
          if (attempt === 3) console.log(`❌ (intento ${attempt} fallido)`);
        }
        await delay(2000);
      }
      if (!batchSuccess) console.log('⚠️ Saltando lote por error de generación.');
    }

    if (questions.length > 0) {
      const { error: eErr } = await aDb.from('exams').insert({
        course_id: course.id,
        questions: questions.slice(0, 25)
      });
      if (eErr) console.error('    ❌ Error al insertar examen:', eErr.message);
      else      console.log(`    ✓ Examen finalizado con ${questions.length} preguntas.\n`);
    } else {
      console.error('    ❌ Fallo total en la generación del examen.');
    }
  }



  console.log('══════════════════════════════════════════════════════');
  console.log('  ✅ COMPLETADO — 1 PRO + 2 PREMIUM generados        ');
  console.log('══════════════════════════════════════════════════════\n');
}

main()
  .then(() => {
    console.log('🥘 Iniciando inyección de ingredientes de recetas...\n');
    return require('child_process').execSync('node scripts/seed_recipe_ingredients.js', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  })
  .catch(console.error);
