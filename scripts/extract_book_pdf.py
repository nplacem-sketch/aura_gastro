import argparse
import json
import re
import sys
from pathlib import Path

import fitz
import pytesseract
from PIL import Image


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


def page_text(doc: fitz.Document, page_index: int, max_chars: int) -> str:
    text = doc.load_page(page_index).get_text("text") or ""
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars]


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
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            chunks.append(text[:max_chars_per_page])

    return "\n\n".join(chunks)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--max-pages", type=int, default=6)
    parser.add_argument("--min-text-chars", type=int, default=1800)
    parser.add_argument("--max-chars-per-page", type=int, default=1800)
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
        text = page_text(doc, page_index, args.max_chars_per_page)
        if text:
            texts.append(f"[Pagina {page_index + 1}] {text}")

    extracted_text = "\n\n".join(texts)
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
    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
