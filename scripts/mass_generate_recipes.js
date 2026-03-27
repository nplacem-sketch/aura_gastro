const topics = {
  FREE: [
    "Caldo Corto de Pescado de Roca", "Salsa Holandesa Clasica", "Cortes de Verdura: Brunoise y Juliana",
    "Huevo a Baja Temperatura (64 grados)", "Arroz Blanco al Estilo Sushi", "Reduccion de Vino Tinto y Chalotas",
    "Mayonesa de Ajo Negro Emulsionada", "Masa Madre de Centeno desde Cero", "Pollo Asado con Hierbas Provenzales",
    "Bisque de Gamba Roja Tradicional"
  ],
  PRO: [
    "Salmon Curado en Remolacha y Gin-Tonic", "Confit de Pato en Grasa de Iberico", "Risotto de Setas con Aire de Parmesano",
    "Magret de Pato con Reduccion de Cerezas", "Corvina al Horno con Escamas de Patata", "Terrina de Foie Gras con Sauternes",
    "Cochinillo Crujiente a la Segoviana", "Bacalao Confitado con Alioli de Membrillo", "Tataki de Atun en Costra de Sesamo",
    "Pasta Fresca de Yema con Trufa Negra"
  ],
  PREMIUM: [
    "Esferificacion Inversa de Aceituna Gordal", "Falso Caviar de Melon con Alginato", "Clarificado de Tomate con Agar-Agar",
    "Espuma de Mar de Erizo con Sifon", "Liofilizado de Fresa y Albahaca", "Pescado en Costra de Sal de Ceniza",
    "Gelatina Caliente de Jamon con Metilcelulosa", "Cordero a 55 grados por 24 horas", "Nieve de Vinagre de Jerez con Nitrogeno",
    "Papel de Patata Crujiente y Transparente", "Ostra con Nube de Agua de Mar", "Tendones de Ternera con Trufa y Destilados",
    "Ravioli Liquido de Guisante Lagrima", "Pichon de Sangre con Emulsion de Cafe", "Carret de Cordero en Costra de Arcilla",
    "Puerro Quemado con Ceniza de Puerro y Romesco", "Sepia liofilizada con Tinta de Calamar", "Gnocchi de Calabaza sin Harina (Kappa)",
    "Canelon de Aguacate y Bogavante con Aire de Lima", "Estofado de Setas con Tierra de Chocolate y Boletus"
  ]
};

async function start() {
  console.log("--- INICIANDO GENERACION MASIVA CON KIMI (OLLAMA) ---");

  const headers = {
    'Content-Type': 'application/json',
    ...(process.env.INTERNAL_API_SECRET ? { 'x-internal-api-key': process.env.INTERNAL_API_SECRET } : {}),
  };

  for (const [tier, list] of Object.entries(topics)) {
    console.log(`\n>>> Procesando Plan: ${tier} (${list.length} recetas)`);
    for (const topic of list) {
      console.log(`Generando: ${topic}...`);
      try {
        const res = await fetch('http://localhost:3000/api/bots/generate-content', {
          method: 'POST',
          headers,
          body: JSON.stringify({ type: 'recipe', topic, tier }),
        });
        const data = await res.json();
        if (data.success) {
          console.log(`[OK] ${topic} ID: ${data.id}`);
        } else {
          console.error(`[ERR] ${topic}: ${data.error}`);
        }
      } catch (e) {
        console.error(`[FATAL] ${topic}: ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

start();
