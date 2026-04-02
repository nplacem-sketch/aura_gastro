import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'No token' }, { status: 401 });

    const { originalText, newText, deleteBlock } = await req.json();

    // Para eliminación de bloque, solo necesitamos originalText
    if (deleteBlock) {
      if (!originalText) {
        return NextResponse.json({ error: 'No block content provided' }, { status: 400 });
      }
    } else {
      // Para edición de texto, necesitamos ambos
      if (!originalText || !newText || originalText === newText) {
        return NextResponse.json({ error: 'Invalid texts' }, { status: 400 });
      }
    }

    // A simple recursive directory search
    const traverseDir = (dir: string, fileCallback: (filePath: string) => void) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          traverseDir(fullPath, fileCallback);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
          fileCallback(fullPath);
        }
      }
    }

    const srcDir = path.join(process.cwd(), 'src');
    let replacedFiles: string[] = [];

    // Buscamos coincidencia exacta literal
    traverseDir(srcDir, (filePath) => {
      let content = fs.readFileSync(filePath, 'utf8');

      // Chequear ambos, pero con mucho cuidado
      if (content.includes(originalText)) {
        if (deleteBlock) {
          // Eliminar el bloque completo
          const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          content = content.replace(new RegExp(escapeRegExp(originalText), 'g'), '');
        } else {
          // Reemplazar todas las ocurrencias en el archivo
          const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          content = content.replace(new RegExp(escapeRegExp(originalText), 'g'), newText);
        }

        fs.writeFileSync(filePath, content, 'utf8');
        replacedFiles.push(filePath.replace(process.cwd(), ''));
      }
    });

    if (replacedFiles.length === 0) {
      return NextResponse.json({ error: 'Text not found in any source file. (Puede ser dinámico desde DB o un componente compuesto)' }, { status: 404 });
    }

    return NextResponse.json({ success: true, replacedFiles });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
