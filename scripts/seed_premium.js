const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const DB_URI = process.env.DATABASE_URL;
if (!DB_URI) {
  console.error('Missing DATABASE_URL. Define it in your environment or in .env.local.');
  process.exit(1);
}

async function seed() {
  const client = new Client({ connectionString: DB_URI, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('✅ Seeding Premium AURA GASTRONOMY Content...');

  try {
    // ── Seed Academia ────────────────────────────────────────────────────────
    const { rows: courses } = await client.query(`
      INSERT INTO courses (title, description, level, duration, lessons_count, is_premium, author) VALUES
      ('Arquitectura del Flavor', 'Un análisis profundo sobre las bases moleculares de los sabores primarios y secundarios.', 'Instructor Anónimo', '12h', 8, true, 'Aura Lab'),
      ('Técnicas de Vacío Avanzadas', 'Dominio del Sous-vide en texturas no convencionales: frutas, infusiones y fermentos.', 'Chef', '6h', 5, true, 'Chef Marc Valder'),
      ('Introducción a la Gastronomía', 'Las bases de la cocina profesional para entusiastas.', 'Básico', '4h', 10, false, 'Academia Abierta')
      RETURNING id, title;
    `);

    // Add modules for courses
    for (const course of courses) {
      const { rows: modules } = await client.query(`
        INSERT INTO modules (course_id, title, content, order_index) VALUES
        ('${course.id}', 'Introducción', 'Conceptos clave de ${course.title}', 0),
        ('${course.id}', 'Teoría Avanzada', 'Fundamentos teóricos revisados.', 1)
        RETURNING id;
      `);
      
      for (const mod of modules) {
        await client.query(`
          INSERT INTO lessons (module_id, title, duration, order_index) VALUES
          ('${mod.id}', 'Lección 1: Contexto', '15m', 0),
          ('${mod.id}', 'Lección 2: Práctica', '45m', 1)
        `);
      }
    }

    // ── Seed Laboratory ──────────────────────────────────────────────────────
    const { rows: ingredients } = await client.query(`
      INSERT INTO ingredients (name, scientific_name, category, origin_region, technical_data, is_premium) VALUES
      ('Azafrán de la Mancha', 'Crocus sativus', 'Especias', 'Castilla-La Mancha, ESP', '{"crocin": 20, "safranal": "high"}'::jsonb, true),
      ('Yuzu Koshō', 'Citrus junos x Capsicum', 'Condimentos', 'Kyushu, JPN', '{"pH": 4.1, "salinity": "15%"}'::jsonb, true),
      ('Clorofila de Espinaca', 'Spinacia oleracea', 'Extractos', 'Global', '{"extraction_method": "centrifuge"}'::jsonb, false)
      RETURNING id, name;
    `);

    await client.query(`
      INSERT INTO techniques (name, description, difficulty, science_basis, is_premium) VALUES
      ('Spherification Inversa', 'Técnica vanguardista para encapsular líquidos de alta densidad cálcica.', 'Avanzado', 'Reacción de Alginato de Sodio y Gluconolactato Cálcico', true),
      ('Clarificación por Congelación', 'Método para obtener caldos cristalinos sin alterar el perfil térmico.', 'Medio', 'Fusión fraccionada de coloides', true)
    `);

    // ── Seed Recipes ─────────────────────────────────────────────────────────
    const { rows: recipes } = await client.query(`
      INSERT INTO recipes (title, description, difficulty, tier, is_premium, tags) VALUES
      ('Ostra en su Hábitat', 'Ostra clarificada con granizado de agua de mar y aire de limón.', 'Experto', 'PREMIUM', true, ARRAY['Molecular', 'Marisco']),
      ('Risotto de Setas Silvestres', 'Técnica clásica con emulsión de mantequilla noisette.', 'Medio', 'FREE', false, ARRAY['Vegetariano', 'Clásico'])
      RETURNING id, title;
    `);

    // Add steps for the oyster recipe
    const oysterId = recipes.find(r => r.title === 'Ostra en su Hábitat').id;
    await client.query(`
      INSERT INTO recipe_steps (recipe_id, step_number, instruction) VALUES
      ('${oysterId}', 1, 'Abrir las ostras conservando el agua.'),
      ('${oysterId}', 2, 'Clarificar el agua con agar-agar mediante congelación rápida.')
    `);

    // ── Seed Realtime Hub ───────────────────────────────────────────────────
    await client.query(`
      INSERT INTO chat_rooms (name, topic, is_private, is_premium) VALUES
      ('Chef Corner', 'Discusión técnica sobre alta cocina.', false, true),
      ('Cafetería', 'Socialización general entre alumnos.', false, false),
      ('Staff / Admin', 'Canal privado de moderación.', true, true)
    `);

    console.log('✅ Platform populated with premium data.');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await client.end();
  }
}

seed();
