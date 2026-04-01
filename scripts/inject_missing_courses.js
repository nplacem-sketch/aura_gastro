const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const coursesList = {
  FREE: [
    "Fundamentos de Seguridad Alimentaria y APPCC", 
    "Bases de la Cocina Mediterranea: Arroces y Guisos",
    "Iniciacion a la Reposteria: Masas Quebradas y Cremas", 
    "Corte y Manipulacion Profesional de Cuchilleria",
    "Conservacion de Alimentos: Frio, Congelacion y Curado"
  ],
  PRO: [
    "Cocina al Vacio (Sous-Vide) para Restaurantes", 
    "Fermentaciones Contemporaneas: Kombucha y Miso",
    "Charcuteria Fina: Galantinas y Terrinas Modernas", 
    "Pasteleria de Restaurante y Postres al Plato",
    "Gestion de Costes y Escandallos para el Chef", 
    "Tecnicas de Pescados: Del Ronqueo a la Maduracion",
    "Ahumados y Cocina de Humo (Draft)", 
    "Maridaje y Analisis Sensorial de Vinos Tecnicos",
    "Cocina Vegetariana de Alta Gama", 
    "Arquitectura del Menu Degustacion"
  ],
  PREMIUM: [
    "Ingenieria Gastronomica: Espumas, Aires y Geles", 
    "Texturantes de Vanguardia: Agar, Kappa, Metil",
    "Esferificaciones y Encapsulados (Quimica Culinaria)", 
    "Liofilizacion y Deshidrataciones Extremas",
    "Criotecnia y Cocina con Nitrogeno Liquido", 
    "Destilados y Rotovap en el Laboratorio de Cocina",
    "Psicopercepcion del Sabor y Neurogastronomia", 
    "Estructuracion de Grasas y Emulsiones No Convencionales",
    "Clarificaciones Avanzadas: Del Sifon a la Spinzall", 
    "Fermentaciones Koji y Envejecimiento de Proteinas",
    "Tecnicas de Cocina Japonesa Kaiseki de Vanguardia", 
    "Manejo de Enenzimas (Transglutaminasa, Pectinasa)",
    "Parrilla de Precision: Control de Terpenos y Reaccion Maillard", 
    "Diseno de Experiencia Gastronomica 360",
    "Biodiversidad y Nuevos Ingredientes Marinos", 
    "Liquidos Estructurados y Cocteleria Molecular",
    "Pasteleria Evolutiva: Sin Azucares ni Gluten Tecnicos", 
    "Micologia Gastronomica: Perfiles de Humina",
    "Gestion de Equipos y Liderazgo de Brigade", 
    "Sostenibilidad y Residuo Cero (Cradle to Cradle)"
  ]
};

const academy = createClient(process.env.SUPABASE_ACADEMY_URL, process.env.SUPABASE_ACADEMY_SERVICE_KEY);

async function main() {
  console.log('Inyectando los 35 cursos de la Academia Aura...');

  let order = 1;
  for (const [tier, list] of Object.entries(coursesList)) {
    for (const title of list) {
      console.log(`Procesando [${tier}] ${title}...`);
      
      const { data: existing } = await academy.from('courses').select('id').eq('title', title).maybeSingle();
      
      const payload = {
        title,
        description: `Programa profesional avanzado sobre ${title.toLowerCase()}. Incluye modulos tecnicos, aplicacion guiada y cierre editorial dentro del campus Aura Gastronomy.`,
        tier,
        level: tier === 'FREE' ? 'Iniciacion' : tier === 'PRO' ? 'Chef Elite' : 'Master Vanguarda',
        duration: '10-25 horas',
        course_order: order++,
        status: 'published',
        author: 'AURA GASTRONOMY',
        is_premium: tier !== 'FREE',
        is_ai_generated: false,
        tags: [tier, 'profesional', title.split(' ')[0].toLowerCase()]
      };

      let courseId;
      if (existing) {
        const { data, error } = await academy.from('courses').update(payload).eq('id', existing.id).select('id').single();
        if (error) throw error;
        courseId = data.id;
      } else {
        const { data, error } = await academy.from('courses').insert(payload).select('id').single();
        if (error) throw error;
        courseId = data.id;
      }

      // Ensure modules and lessons exist (minimal)
      const { data: modules } = await academy.from('modules').select('id').eq('course_id', courseId);
      if (!modules || modules.length === 0) {
        const { data: newModules, error: mErr } = await academy.from('modules').insert([
          { course_id: courseId, title: 'Modulo 1: Fundamentos y Contexto', order_index: 0 },
          { course_id: courseId, title: 'Modulo 2: Metodologia y Procesos', order_index: 1 },
          { course_id: courseId, title: 'Modulo 3: Aplicacion y Vanguardia', order_index: 2 }
        ]).select('id');
        if (mErr) throw mErr;

        for (const mod of newModules) {
          await academy.from('lessons').insert([
            { module_id: mod.id, title: 'Leccion 1: Teoria base', duration: '15m', order_index: 0, content: 'Contenido en preparacion...' },
            { module_id: mod.id, title: 'Leccion 2: Ejecucion tecnica', duration: '25m', order_index: 1, content: 'Contenido en preparacion...' }
          ]);
        }
      }
    }
  }

  console.log('Todos los cursos han sido inyectados correctamente.');
}

main().catch(console.error);
