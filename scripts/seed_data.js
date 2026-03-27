const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const dbUri = process.env.DATABASE_URL;
if (!dbUri) {
  console.error('Missing DATABASE_URL. Define it in your environment or in .env.local.');
  process.exit(1);
}

async function seed() {
  const client = new Client({ connectionString: dbUri, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  console.log('--- SEEDING AURA GASTRONOMY CONTENT ---');
  
  try {
    // Courses
    await client.query(`
      INSERT INTO courses (title, description, level, duration, lessons_count, is_premium)
      VALUES 
      ('Master en Fermentación', 'Descubre la ciencia detrás de los fermentos ancestrales y modernos.', 'Chef Elite', '40h', 12, true),
      ('Texturas y Espumas', 'Dominio de hidrocoloides y técnicas de sifón avanzada.', 'Intermedio', '15h', 8, false),
      ('Cocina de Vanguardia', 'Introducción a la gastronomía molecular y conceptual.', 'Chef', '25h', 10, true)
      ON CONFLICT DO NOTHING;
    `);

    // Ingredients
    await client.query(`
      INSERT INTO ingredients (name, description, category, origin, optimal_temp, ph_range)
      VALUES 
      ('Agar-Agar', 'Extracto de algas rojas para gelificaciones en caliente.', 'Hidrocoloide', 'Japón', '85°C', '4.5 - 9.0'),
      ('Nitrógeno Líquido', 'Agente de enfriamiento criogénico extremo.', 'Criogenia', 'Industrial', '-196°C', 'Neutro'),
      ('Lecitina de Soja', 'Emulsionante para la creación de aires y burbujas.', 'Emulsionante', 'Global', '20-40°C', '6.0 - 7.0')
      ON CONFLICT DO NOTHING;
    `);

    // Recipes
    await client.query(`
      INSERT INTO recipes (title, description, difficulty, prep_time, tier)
      VALUES 
      ('Aire de Remolacha y Jengibre', 'Una nube etérea con equilibrio terroso y picante.', 'Fácil', '15 min', 'FREE'),
      ('Ravioli Líquido de Guisantes', 'Esferificación inversa clásica de la cocina moderna.', 'Difícil', '1h 20 min', 'PREMIUM'),
      ('Nieve de Foie Gras', 'Textura ultracongelada con rallador microplane.', 'Media', '30 min', 'PRO')
      ON CONFLICT DO NOTHING;
    `);

    console.log('Successfully seeded AURA GASTRONOMY content.');
  } catch (e) {
    console.error('Error seeding data:', e.message);
  } finally {
    await client.end();
  }
}

seed();
