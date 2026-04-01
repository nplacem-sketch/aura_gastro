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

  // Remove the escaped asterisks just in case they exist, convert them to regular asterisks
  let cleanedDesc = descRaw.replace(/\\\*/g, '*');

  // Split by `- **` or `.- **`
  let segments = cleanedDesc.split(/(?:^|\.\s*)\-\s*\*\*/);

  // segments[0] could be empty or normal text
  if (segments[0].trim()) {
      culinary_notes.push(segments[0].replace(/\*\*/g, '').replace(/\*/g, '').replace(/more_horiz/g, '').replace(/\s+/g, ' ').trim());
  }

  for (let i = 1; i < segments.length; i++) {
     let seg = segments[i].trim();
     
     // Match everything before the first colon or asterisk sequence, then the rest
     let matchSeg = seg.match(/^([^:*]+)[:*]+\s*([\s\S]*)/);
     
     if (matchSeg) {
         let key = matchSeg[1].trim().replace(/\*/g, '');
         let val = matchSeg[2].trim().replace(/\*/g, '').replace(/more_horiz/g, '').replace(/\s+/g, ' ');
         val = val.replace(/^\.\s*/, '');
         
         technical_data[key] = val;
         culinary_notes.push(`${key.toUpperCase()}: ${val}`);
     } else {
         culinary_notes.push(seg.replace(/\*\*/g, '').replace(/\*/g, '').replace(/more_horiz/g, '').replace(/\s+/g, ' ').trim());
     }
  }

  items.push({ 
    name: title, 
    culinary_notes: culinary_notes.join('\n\n'), 
    technical_data: Object.keys(technical_data).length > 0 ? technical_data : null 
  });
}

console.log('--- TEST ---');
console.dir(items[0], {depth: null});
console.dir(items[2], {depth: null});
