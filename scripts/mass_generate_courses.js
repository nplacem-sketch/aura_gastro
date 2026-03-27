const courses = {
  FREE: [
    "Fundamentos de Seguridad Alimentaria y APPCC", "Bases de la Cocina Mediterranea: Arroces y Guisos",
    "Iniciacion a la Reposteria: Masas Quebradas y Cremas", "Corte y Manipulacion Profesional de Cuchilleria",
    "Conservacion de Alimentos: Frio, Congelacion y Curado"
  ],
  PRO: [
    "Cocina al Vacio (Sous-Vide) para Restaurantes", "Fermentaciones Contemporaneas: Kombucha y Miso",
    "Charcuteria Fina: Galantinas y Terrinas Modernas", "Pasteleria de Restaurante y Postres al Plato",
    "Gestion de Costes y Escandallos para el Chef", "Tecnicas de Pescados: Del Ronqueo a la Maduracion",
    "Ahumados y Cocina de Humo (Draft)", "Maridaje y Analisis Sensorial de Vinos Tecnicos",
    "Cocina Vegetariana de Alta Gama", "Arquitectura del Menu Degustacion"
  ],
  PREMIUM: [
    "Ingenieria Gastronomica: Espumas, Aires y Geles", "Texturantes de Vanguardia: Agar, Kappa, Metil",
    "Esferificaciones y Encapsulados (Quimica Culinaria)", "Liofilizacion y Deshidrataciones Extremas",
    "Criotecnia y Cocina con Nitrogeno Liquido", "Destilados y Rotovap en el Laboratorio de Cocina",
    "Psicopercepcion del Sabor y Neurogastronomia", "Estructuracion de Grasas y Emulsiones No Convencionales",
    "Clarificaciones Avanzadas: Del Sifon a la Spinzall", "Fermentaciones Koji y Envejecimiento de Proteinas",
    "Tecnicas de Cocina Japonesa Kaiseki de Vanguardia", "Manejo de Enzimas (Transglutaminasa, Pectinasa)",
    "Parrilla de Precision: Control de Terpenos y Reaccion Maillard", "Diseno de Experiencia Gastronomica 360",
    "Biodiversidad y Nuevos Ingredientes Marinos", "Liquidos Estructurados y Cocteleria Molecular",
    "Pasteleria Evolutiva: Sin Azucares ni Gluten Tecnicos", "Micologia Gastronomica: Perfiles de Humina",
    "Gestion de Equipos y Liderazgo de Brigade", "Sostenibilidad y Residuo Cero (Cradle to Cradle)"
  ]
};

async function start() {
  console.log("--- INICIANDO GENERACION MASIVA DE ACADEMIA CON KIMI (OLLAMA) ---");

  const headers = {
    'Content-Type': 'application/json',
    ...(process.env.INTERNAL_API_SECRET ? { 'x-internal-api-key': process.env.INTERNAL_API_SECRET } : {}),
  };

  for (const [tier, list] of Object.entries(courses)) {
    console.log(`\n>>> Procesando Academia: ${tier} (${list.length} cursos)`);
    for (const topic of list) {
      console.log(`Generando Curso: ${topic}...`);
      try {
        const res = await fetch('http://localhost:3000/api/bots/generate-content', {
          method: 'POST',
          headers,
          body: JSON.stringify({ type: 'course', topic, tier }),
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
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

start();
