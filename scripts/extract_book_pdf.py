import argparse
import io
import json
import re
import sys
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

import fitz
import pytesseract
from PIL import Image


HEADING_RE = re.compile(r"^(?P<section>\d+\s*(?:\.\s*\d+\s*)*\.?)\s+\S")
ORDERED_LIST_RE = re.compile(r"^\d+\s*[.)]\s+")
UNORDERED_LIST_RE = re.compile(r"^[*\-\u2022]\s+")
TABLE_TITLE_RE = re.compile(r"^\*\*tabla\b", re.IGNORECASE)


def slugify(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip())
    value = value.strip("-._")
    return value or "book"


def pick_sample_pages(page_count: int, max_pages: int) -> list[int]:
    if page_count <= 0:
        return []

    if page_count <= max_pages:
        return list(range(page_count))

    indexes = {0, page_count - 1, page_count // 2}
    spread = max_pages - len(indexes)
    if spread > 0:
        for i in range(spread):
            ratio = (i + 1) / (spread + 1)
            indexes.add(min(page_count - 1, int((page_count - 1) * ratio)))

    return sorted(indexes)[:max_pages]


def truncate(text: str, max_chars: int) -> str:
    if max_chars <= 0 or len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip()


def normalize_spaces(value: str) -> str:
    return re.sub(r"[ \t]+", " ", value or "").strip()


def normalize_cell(value: str) -> str:
    cleaned = normalize_spaces((value or "").replace("\r", "").replace("\n", " "))
    cleaned = cleaned.replace("|", r"\|")
    return cleaned


def normalize_text_lines(text: str) -> list[str]:
    prepared = (text or "").replace("\r", "")
    prepared = re.sub(r"\s+\*\s+(?=\*\*)", "\n* ", prepared)
    prepared = re.sub(r"(?<!\n)(\d+\s*[.)]\s+\*\*)", r"\n\1", prepared)

    lines: list[str] = []
    for raw_line in prepared.splitlines():
        line = normalize_spaces(raw_line)
        if line:
            lines.append(line)
        elif lines and lines[-1] != "":
            lines.append("")

    index = 0
    while index < len(lines) - 1:
        if re.fullmatch(r"\d+", lines[index]) and re.match(r"^\d+\.\s+", lines[index + 1]):
            lines[index + 1] = f"{lines[index]}{lines[index + 1]}"
            del lines[index]
            continue
        index += 1

    return lines


def is_heading(line: str) -> bool:
    return bool(HEADING_RE.match(line) or TABLE_TITLE_RE.match(line))


def format_heading(line: str) -> str:
    if TABLE_TITLE_RE.match(line):
        return f"### {line.strip('* ')}"

    match = HEADING_RE.match(line)
    if not match:
        return f"### {line}"

    normalized_line = re.sub(r"\s*\.\s*", ". ", line)
    normalized_line = re.sub(r"\.\s+(?=\d+\.)", ".", normalized_line)
    normalized_line = re.sub(r"\s{2,}", " ", normalized_line).strip()
    depth = match.group("section").count(".")
    level = "##" if depth <= 1 else "###"
    return f"{level} {normalized_line}"


def is_ordered_list_context(lines: list[str], index: int) -> bool:
    line = lines[index]
    if re.match(r"^\d+\s*[.)]\s+\*\*", line):
        return True

    next_index = index + 1
    while next_index < len(lines) and not lines[next_index]:
        next_index += 1

    return next_index < len(lines) and bool(ORDERED_LIST_RE.match(lines[next_index]))


def normalize_list_item(line: str) -> str:
    line = re.sub(r"\s{2,}", " ", line).strip()
    if ORDERED_LIST_RE.match(line):
        return re.sub(r"^(\d+)\s*[.)]\s+", r"\1. ", line)

    return re.sub(r"^[*\-\u2022]\s+", "- ", line)


def render_text_block(text: str) -> str:
    lines = normalize_text_lines(text)
    if not lines:
        return ""

    rendered: list[str] = []
    paragraph: list[str] = []
    index = 0

    def flush_paragraph() -> None:
        if paragraph:
            rendered.append(" ".join(paragraph).strip())
            paragraph.clear()

    while index < len(lines):
        line = lines[index]

        if not line:
            flush_paragraph()
            index += 1
            continue

        if line in {"*", "-", "\u2022"} and index + 1 < len(lines):
            lines[index + 1] = f"* {lines[index + 1].lstrip()}"
            index += 1
            continue

        if ORDERED_LIST_RE.match(line) and is_ordered_list_context(lines, index):
            flush_paragraph()
            items: list[str] = []

            while index < len(lines):
                current = lines[index]
                if not current:
                    index += 1
                    break

                if not ORDERED_LIST_RE.match(current):
                    break

                item_parts = [normalize_list_item(current)]
                index += 1

                while index < len(lines):
                    continuation = lines[index]
                    if not continuation:
                        index += 1
                        break
                    if ORDERED_LIST_RE.match(continuation) or UNORDERED_LIST_RE.match(continuation) or is_heading(continuation):
                        break
                    item_parts.append(continuation)
                    index += 1

                items.append(" ".join(part.strip() for part in item_parts if part.strip()))

            rendered.append("\n".join(items))
            continue

        if UNORDERED_LIST_RE.match(line):
            flush_paragraph()
            items: list[str] = []

            while index < len(lines):
                current = lines[index]
                if not current:
                    index += 1
                    break

                if not UNORDERED_LIST_RE.match(current):
                    break

                item_parts = [normalize_list_item(current)]
                index += 1

                while index < len(lines):
                    continuation = lines[index]
                    if not continuation:
                        index += 1
                        break
                    if ORDERED_LIST_RE.match(continuation) or UNORDERED_LIST_RE.match(continuation) or is_heading(continuation):
                        break
                    item_parts.append(continuation)
                    index += 1

                items.append(" ".join(part.strip() for part in item_parts if part.strip()))

            rendered.append("\n".join(items))
            continue

        if is_heading(line):
            flush_paragraph()
            heading_parts = [line]
            index += 1

            while index < len(lines):
                continuation = lines[index]
                if not continuation:
                    break
                if is_heading(continuation) or ORDERED_LIST_RE.match(continuation) or UNORDERED_LIST_RE.match(continuation):
                    break
                if len(continuation) > 90:
                    break
                heading_parts.append(continuation)
                index += 1

            rendered.append(format_heading(" ".join(heading_parts)))
            continue

        paragraph.append(line)
        index += 1

    flush_paragraph()
    return "\n\n".join(part for part in rendered if part.strip()).strip()


def boxes_intersect(left: fitz.Rect, right: fitz.Rect) -> bool:
    intersection = left & right
    if intersection.is_empty or left.is_empty:
        return False
    return (intersection.get_area() / max(left.get_area(), 1)) >= 0.12


def safe_find_tables(page: fitz.Page):
    sink = io.StringIO()
    with redirect_stdout(sink), redirect_stderr(sink):
        return page.find_tables()


def render_markdown_table(rows: list[list[str]]) -> str:
    if not rows:
        return ""

    normalized_rows: list[list[str]] = []
    width = max(len(row) for row in rows)

    for row in rows:
        padded = list(row) + [""] * (width - len(row))
        normalized_rows.append([normalize_cell(cell) for cell in padded])

    header = normalized_rows[0]
    body = normalized_rows[1:] or [[""] * width]

    lines = [
        "| " + " | ".join(header) + " |",
        "| " + " | ".join(["---"] * width) + " |",
    ]
    for row in body:
        lines.append("| " + " | ".join(row) + " |")

    return "\n".join(lines)


def merge_text_blocks(blocks: list[tuple[fitz.Rect, str]]) -> list[tuple[fitz.Rect, str]]:
    if not blocks:
        return []

    merged: list[tuple[fitz.Rect, str]] = [blocks[0]]

    for bbox, text in blocks[1:]:
        prev_bbox, prev_text = merged[-1]
        vertical_gap = bbox.y0 - prev_bbox.y1
        same_column = abs(bbox.x0 - prev_bbox.x0) <= 24
        overlap = min(prev_bbox.x1, bbox.x1) - max(prev_bbox.x0, bbox.x0)
        min_width = max(min(prev_bbox.width, bbox.width), 1)
        similar_width = overlap / min_width >= 0.45

        if vertical_gap <= 14 and same_column and similar_width:
            merged_bbox = fitz.Rect(
                min(prev_bbox.x0, bbox.x0),
                min(prev_bbox.y0, bbox.y0),
                max(prev_bbox.x1, bbox.x1),
                max(prev_bbox.y1, bbox.y1),
            )
            merged[-1] = (merged_bbox, prev_text.rstrip() + "\n" + text.lstrip())
        else:
            merged.append((bbox, text))

    return merged


def page_markdown(doc: fitz.Document, page_index: int, max_chars: int) -> str:
    page = doc.load_page(page_index)

    table_items: list[tuple[float, float, str, fitz.Rect]] = []
    if hasattr(page, "find_tables"):
        tables = safe_find_tables(page)
        for table in tables.tables:
            rendered = render_markdown_table(table.extract())
            if rendered.strip():
                table_items.append((table.bbox[1], table.bbox[0], rendered, fitz.Rect(table.bbox)))

    raw_blocks: list[tuple[fitz.Rect, str]] = []
    for block in page.get_text("blocks"):
        bbox = fitz.Rect(block[:4])
        text = block[4]
        if not normalize_spaces(text):
            continue
        if any(boxes_intersect(bbox, table_bbox) for _, _, _, table_bbox in table_items):
            continue
        raw_blocks.append((bbox, text))

    items: list[tuple[float, float, str]] = []
    for bbox, text in merge_text_blocks(raw_blocks):
        rendered = render_text_block(text)
        if rendered:
            items.append((bbox.y0, bbox.x0, rendered))

    for y0, x0, rendered, _ in table_items:
        items.append((y0, x0, rendered))

    items.sort(key=lambda entry: (round(entry[0], 2), round(entry[1], 2)))

    page_parts: list[str] = []
    for _, _, rendered in items:
        cleaned = rendered.strip()
        if not cleaned:
            continue
        if page_parts:
            page_parts.append("")
        page_parts.append(cleaned)

    return truncate("\n".join(page_parts).strip(), max_chars)


def render_page(doc: fitz.Document, page_index: int, output_dir: Path, dpi: int) -> str:
    page = doc.load_page(page_index)
    matrix = fitz.Matrix(dpi / 72.0, dpi / 72.0)
    pixmap = page.get_pixmap(matrix=matrix, alpha=False)
    image_path = output_dir / f"page-{page_index + 1:04d}.png"
    pixmap.save(str(image_path))
    return str(image_path)


def configure_tesseract() -> None:
    candidates = [
        Path("C:/Program Files/Tesseract-OCR/tesseract.exe"),
        Path("C:/Program Files (x86)/Tesseract-OCR/tesseract.exe"),
    ]

    current = Path(str(getattr(pytesseract.pytesseract, "tesseract_cmd", "") or ""))
    if current.exists():
        return

    for candidate in candidates:
        if candidate.exists():
            pytesseract.pytesseract.tesseract_cmd = str(candidate)
            return


def ocr_images(image_paths: list[str], max_chars_per_page: int) -> str:
    configure_tesseract()
    chunks: list[str] = []

    for image_path in image_paths:
        with Image.open(image_path) as image:
            text = pytesseract.image_to_string(image, lang="eng")
        text = normalize_spaces(text)
        if text:
            chunks.append(truncate(text, max_chars_per_page))

    return "\n\n".join(chunks)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--max-pages", type=int, default=6)
    parser.add_argument("--min-text-chars", type=int, default=1800)
    parser.add_argument("--max-chars-per-page", type=int, default=0)
    parser.add_argument("--dpi", type=int, default=144)
    args = parser.parse_args()

    pdf_path = Path(args.path)
    output_dir = Path(args.out_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not pdf_path.exists():
        print(json.dumps({"error": f"File not found: {pdf_path}"}))
        return 1

    doc = fitz.open(str(pdf_path))
    sample_pages = pick_sample_pages(doc.page_count, args.max_pages)

    texts: list[str] = []
    for page_index in sample_pages:
        text = page_markdown(doc, page_index, args.max_chars_per_page)
        if text:
            texts.append(text)

    extracted_text = "\n\n".join(texts).strip()
    needs_vision = len(extracted_text) < args.min_text_chars

    images: list[str] = []
    if needs_vision:
        book_dir = output_dir / slugify(pdf_path.stem)
        book_dir.mkdir(parents=True, exist_ok=True)
        for page_index in sample_pages:
            images.append(render_page(doc, page_index, book_dir, args.dpi))

        ocr_text = ocr_images(images, args.max_chars_per_page)
        if len(ocr_text) > len(extracted_text):
            extracted_text = ocr_text
        needs_vision = len(extracted_text) < args.min_text_chars

    payload = {
        "file": str(pdf_path),
        "title": (doc.metadata or {}).get("title") or pdf_path.stem,
        "page_count": doc.page_count,
        "sample_pages": [page + 1 for page in sample_pages],
        "text": extracted_text,
        "text_chars": len(extracted_text),
        "needs_vision": needs_vision,
        "images": images,
        "ocr_used": len(images) > 0 and len(extracted_text) > 0,
    }
    print(json.dumps(payload, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
