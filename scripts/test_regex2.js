const fs = require('fs');
const text = fs.readFileSync('C:\\Users\\Casa\\Downloads\\cursos\\laboratoy\\Biblioteca Maestra de Gastronomía Moderna y Técnicas Culinarias - Curated Briefing - 2026-04-01.md', 'utf8');

const regex = /\*\*(\d+)\\\.\s*(.*?)\*\*\n+([\s\S]*?)(?=\n\*\*(\d+)\\\.\s*|\n\\-{10}|\n\*\*Nota para el experto:|$)/g;

let match;
const items = [];
while ((match = regex.exec(text)) !== null) {
  let title = match[2].replace(/\\\*/g, '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
  let descRaw = match[3];

  let technical_data = {};
  let culinary_notes = [];

  // Match something like "- **Key:**" or ".- **Key:**" or "- \*Key:\*"
  const bullets = descRaw.split(/(?:^|\.\s*|\n)\-\s*(?:\*\*|\\\*\\\*|\*)([^:*_]+?)(?:\*\*|\\\*\\\*|\*):\s*/g);
  
  if (bullets.length > 1) {
    for (let i = 1; i < bullets.length; i += 2) {
      let key = bullets[i].replace(/\\\*/g, '').replace(/\*/g, '').trim();
      let val = (bullets[i+1] || '').replace(/\\\*/g, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/more_horiz/g, '').replace(/\s+/g, ' ').trim();
      val = val.replace(/^\.\s*/, ''); // limpia si empezó con un punto colgado
      
      technical_data[key] = val;
      culinary_notes.push(`${key.toUpperCase()}: ${val}`);
    }
  } else {
    // just normal text
    let d = descRaw.replace(/\\\*/g, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/more_horiz/g, '').replace(/\s+/g, ' ').trim();
    culinary_notes.push(d);
  }

  items.push({ name: title, culinary_notes: culinary_notes.join('\n\n'), technical_data: Object.keys(technical_data).length > 0 ? technical_data : null });
}

console.log(items[0].name);
console.log(items[0].technical_data);
console.log(items[0].culinary_notes);
console.log('-----');
console.log(items[1].name);
console.log(items[1].technical_data);
