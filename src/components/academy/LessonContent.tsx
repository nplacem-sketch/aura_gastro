import { Fragment, type ReactNode } from 'react';

type LessonContentProps = {
  content: string;
  lessonTitle?: string;
};

type ContentBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

function normalizeComparable(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function sanitizeLessonContent(content: string, lessonTitle?: string) {
  let cleaned = String(content || '')
    .replace(/\r/g, '')
    .replace(/^##\s*Contexto\s+Contenido indexado y estructurado a partir del material original del curso[\s\S]*?##\s*Desarrollo\s+/i, '')
    .replace(/\n+##\s*Aplicacion\s+Trabaja esta unidad como un bloque operativo del modulo[\s\S]*$/i, '')
    .replace(/^\s*Contenido indexado y estructurado a partir del material original del curso[^\n]*$/gim, '')
    .replace(/^\s*Contexto\s*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const lines = cleaned.split('\n');
  const firstLine = lines[0]?.replace(/^#{1,6}\s+/, '').trim();
  if (lessonTitle && firstLine && normalizeComparable(firstLine) === normalizeComparable(lessonTitle)) {
    cleaned = lines.slice(1).join('\n').trim();
  }

  return cleaned;
}

function splitInlineMarkdown(text: string) {
  return String(text || '').split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
}

function renderInlineMarkdown(text: string): ReactNode[] {
  return splitInlineMarkdown(text).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-on-surface">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic text-on-surface">
          {part.slice(1, -1)}
        </em>
      );
    }

    return <Fragment key={index}>{part}</Fragment>;
  });
}

function isTableSeparator(line: string) {
  return /^\|\s*[-: ]+\|/.test(line.trim());
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.replace(/\\\|/g, '|').trim());
}

function normalizeRowSignature(cells: string[]) {
  return cells.map((cell) => normalizeComparable(cell)).join('|');
}

function isEmptyRow(cells: string[]) {
  return cells.every((cell) => !cell.trim());
}

function isHeading(line: string) {
  return /^#{1,6}\s+/.test(line.trim());
}

function isOrderedList(line: string) {
  return /^\d+\.\s+/.test(line.trim());
}

function isUnorderedList(line: string) {
  return /^[-*]\s+/.test(line.trim());
}

function isBlockStart(line: string, nextLine?: string) {
  const trimmed = line.trim();
  return (
    isHeading(trimmed) ||
    isOrderedList(trimmed) ||
    isUnorderedList(trimmed) ||
    (trimmed.startsWith('|') && Boolean(nextLine && isTableSeparator(nextLine)))
  );
}

function stripListMarker(line: string) {
  return line.replace(/^(?:\d+\.|[-*])\s+/, '').trim();
}

function parseContent(content: string) {
  const lines = content.split('\n').map((line) => line.trimEnd());
  const blocks: ContentBlock[] = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    const nextLine = lines[index + 1]?.trim();

    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith('|') && nextLine && isTableSeparator(nextLine)) {
      const headers = parseTableRow(line);
      const headerSignature = normalizeRowSignature(headers);
      const rows: string[][] = [];
      index += 2;

      while (index < lines.length) {
        const current = lines[index].trim();
        if (!current) {
          index += 1;
          continue;
        }
        if (!current.startsWith('|')) break;
        if (isTableSeparator(current)) {
          index += 1;
          continue;
        }
        const row = parseTableRow(current);
        if (!isEmptyRow(row) && normalizeRowSignature(row) !== headerSignature) {
          rows.push(row);
        }
        index += 1;
      }

      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    if (isHeading(line)) {
      const [, hashes, text] = line.match(/^(#{1,6})\s+(.+)$/) || [];
      blocks.push({ type: 'heading', level: hashes?.length ?? 2, text: text ?? line });
      index += 1;
      continue;
    }

    if (isOrderedList(line) || isUnorderedList(line)) {
      const ordered = isOrderedList(line);
      const items: string[] = [];

      while (index < lines.length) {
        const current = lines[index].trim();
        if (!current) {
          index += 1;
          continue;
        }

        const isSameKind = ordered ? isOrderedList(current) : isUnorderedList(current);
        if (!isSameKind) break;

        const itemParts = [stripListMarker(current)];
        index += 1;

        while (index < lines.length) {
          const continuation = lines[index].trim();
          const continuationNext = lines[index + 1]?.trim();
          if (!continuation) {
            index += 1;
            break;
          }
          if (isBlockStart(continuation, continuationNext)) break;
          itemParts.push(continuation);
          index += 1;
        }

        items.push(itemParts.join(' ').trim());
      }

      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    const paragraphParts = [line];
    index += 1;

    while (index < lines.length) {
      const current = lines[index].trim();
      const currentNext = lines[index + 1]?.trim();
      if (!current) {
        index += 1;
        break;
      }
      if (isBlockStart(current, currentNext)) break;
      paragraphParts.push(current);
      index += 1;
    }

    blocks.push({ type: 'paragraph', text: paragraphParts.join(' ').trim() });
  }

  return blocks;
}

function renderHeading(block: Extract<ContentBlock, { type: 'heading' }>, index: number) {
  if (block.level <= 2) {
    return (
      <h3
        key={index}
        className="mt-12 border-t border-secondary/10 pt-8 font-headline text-2xl font-light tracking-[0.01em] text-on-surface sm:text-3xl"
      >
        {renderInlineMarkdown(block.text)}
      </h3>
    );
  }

  return (
    <h4
      key={index}
      className="mt-10 font-label text-[11px] uppercase tracking-[0.32em] text-secondary"
    >
      {renderInlineMarkdown(block.text)}
    </h4>
  );
}

export default function LessonContent({ content, lessonTitle }: LessonContentProps) {
  const cleaned = sanitizeLessonContent(content, lessonTitle);
  const blocks = parseContent(cleaned);

  return (
    <div className="space-y-6">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return renderHeading(block, index);
        }

        if (block.type === 'paragraph') {
          return (
            <p key={index} className="text-[15px] font-light leading-8 text-on-surface-variant sm:text-base sm:leading-9">
              {renderInlineMarkdown(block.text)}
            </p>
          );
        }

        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';
          return (
            <ListTag
              key={index}
              className={`space-y-3 pl-6 text-[15px] font-light leading-8 text-on-surface-variant sm:text-base sm:leading-9 ${
                block.ordered ? 'list-decimal marker:text-secondary' : 'list-disc marker:text-secondary'
              }`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInlineMarkdown(item)}</li>
              ))}
            </ListTag>
          );
        }

        return (
          <div
            key={index}
            className="my-10 overflow-hidden rounded-[28px] border border-secondary/12 bg-white/[0.03] shadow-[0_32px_80px_-56px_rgba(233,193,118,0.55)]"
          >
            <div className="space-y-4 p-4 sm:hidden">
              {block.rows.map((row, rowIndex) => (
                <div key={rowIndex} className="rounded-[22px] border border-secondary/10 bg-black/10 p-4">
                  <div className="mb-3 font-label text-[10px] uppercase tracking-[0.24em] text-secondary">
                    Fila {rowIndex + 1}
                  </div>
                  <div className="space-y-3">
                    {block.headers.map((header, cellIndex) => (
                      <div key={`${rowIndex}-${cellIndex}`} className="border-t border-outline-variant/10 pt-3 first:border-t-0 first:pt-0">
                        <p className="mb-1 font-label text-[10px] uppercase tracking-[0.18em] text-secondary/80">
                          {renderInlineMarkdown(header)}
                        </p>
                        <div className="text-sm leading-7 text-on-surface-variant">
                          {renderInlineMarkdown(row[cellIndex] || '')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-secondary/10 text-[11px] uppercase tracking-[0.22em] text-secondary">
                  <tr>
                    {block.headers.map((header, headerIndex) => (
                      <th key={headerIndex} className="border-b border-secondary/12 px-5 py-4 font-label font-semibold">
                        {renderInlineMarkdown(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t border-outline-variant/10 align-top">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-5 py-4 text-sm leading-7 text-on-surface-variant">
                          {renderInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
