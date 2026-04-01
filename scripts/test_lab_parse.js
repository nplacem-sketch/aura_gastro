const fs = require('fs');
const text = fs.readFileSync('C:\\Users\\Casa\\Downloads\\cursos\\laboratoy\\Biblioteca Maestra de Gastronomía Moderna y Técnicas Culinarias - Curated Briefing - 2026-04-01.md', 'utf8');

const regex = /\*\*(\d+)\\\.\s*(.*?)\*\*\n+([\s\S]*?)(?=\n\*\*(\d+)\\\.\s*|\n\\-{10}|\n\*\*Nota para el experto:|$)/g;

let match;
const items = [];
while ((match = regex.exec(text)) !== null) {
  let title = match[2].replace(/\\\*/g, '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
  let descRaw = match[3];

  let desc = descRaw
    .replace(/\\\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/more_horiz/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  items.push({ name: title, description: desc });
}

console.log(items.slice(0, 3));
console.log(`Found ${items.length} items`);
