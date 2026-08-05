#!/usr/bin/env python3
"""Generate deterministic, synthetic Phase G import and attachment fixtures."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

try:
    from PIL import Image, ImageDraw
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import DictionaryObject, NameObject, TextStringObject
except ImportError as exc:  # pragma: no cover - operator setup guard
    raise SystemExit(
        "Phase G fixture dependencies are missing. Run: "
        "python -m pip install -r scripts/requirements-phase-g-fixtures.txt"
    ) from exc


TEXT_SOURCE = """The Lantern Archive

The city of Bellweather is built around a sealed observatory. Keeper Sable
guards the last star-map. The Glass Concord wants the map before the seventh
bells, while the Orchard Circle believes opening the observatory will wake the
storm beneath it.

Active thread: discover who changed the observatory seal.
Atmosphere: rain on copper roofs, amber lamps, and distant orchard bells.
"""

MARKDOWN_SOURCE = """# The Lantern Archive

## People

- **Keeper Sable** — guardian of the last star-map.
- **Iven Marr** — courier for the Glass Concord.

## Places

- **Bellweather Observatory** — sealed above the copper-roof district.

## Open thread

Discover who changed the observatory seal before the seventh bells.
"""


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_text_pdf(path: Path) -> None:
    document = canvas.Canvas(str(path), pagesize=letter, invariant=1, pageCompression=1)
    document.setTitle("The Lantern Archive")
    document.setAuthor("Relic Phase G synthetic fixture")
    for page_number, lines in enumerate(
        (
            (
                "The Lantern Archive",
                "Bellweather surrounds a sealed observatory.",
                "Keeper Sable guards the last star-map.",
                "The Glass Concord wants it before the seventh bells.",
            ),
            (
                "Open thread",
                "Discover who changed the observatory seal.",
                "Atmosphere: rain, amber lamps, and orchard bells.",
                "This content is synthetic and contains no private data.",
            ),
        ),
        start=1,
    ):
        document.setFont("Helvetica-Bold", 16)
        document.drawString(72, 720, lines[0])
        document.setFont("Helvetica", 11)
        y = 684
        for line in lines[1:]:
            document.drawString(72, y, line)
            y -= 22
        document.setFont("Helvetica", 8)
        document.drawString(72, 42, f"Synthetic Phase G fixture — page {page_number}")
        document.showPage()
    document.save()


def write_blank_pdf(path: Path) -> None:
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    with path.open("wb") as handle:
        writer.write(handle)


def write_image_only_pdf(path: Path, source_png: Path) -> None:
    document = canvas.Canvas(str(path), pagesize=letter, invariant=1, pageCompression=1)
    document.drawImage(ImageReader(str(source_png)), 72, 500, width=320, height=180)
    document.showPage()
    document.save()


def rewrite_pdf(source: Path, target: Path, *, password: str | None = None, javascript: bool = False, attachment: bool = False) -> None:
    reader = PdfReader(str(source))
    writer = PdfWriter()
    writer.append_pages_from_reader(reader)
    if javascript:
        action = DictionaryObject(
            {
                NameObject("/S"): NameObject("/JavaScript"),
                NameObject("/JS"): TextStringObject("app.alert('synthetic Phase G active-content fixture');"),
            }
        )
        writer.root_object[NameObject("/OpenAction")] = writer._add_object(action)
    if attachment:
        writer.add_attachment("embedded-fixture.txt", b"synthetic embedded file")
    if password:
        # RC4-128 keeps the fixture dependency-light; the extractor must reject
        # every encrypted PDF before content parsing regardless of cipher.
        writer.encrypt(password, algorithm="RC4-128")
    with target.open("wb") as handle:
        writer.write(handle)


def write_page_limit_pdf(path: Path, pages: int = 201) -> None:
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=72, height=72)
    with path.open("wb") as handle:
        writer.write(handle)


def write_safe_images(output: Path) -> dict[str, Path]:
    base = Image.new("RGB", (640, 360), "#16131f")
    draw = ImageDraw.Draw(base)
    draw.rectangle((48, 48, 592, 312), outline="#d39a4a", width=8)
    draw.ellipse((250, 90, 390, 230), fill="#774f8e", outline="#f1c77a", width=5)
    draw.line((80, 280, 560, 280), fill="#568276", width=6)

    paths = {
        "safe-atmosphere.jpg": output / "safe-atmosphere.jpg",
        "safe-atmosphere.png": output / "safe-atmosphere.png",
        "safe-atmosphere.webp": output / "safe-atmosphere.webp",
    }
    base.save(paths["safe-atmosphere.jpg"], format="JPEG", quality=88, optimize=False, progressive=False)
    base.save(paths["safe-atmosphere.png"], format="PNG", optimize=False, compress_level=9)
    base.save(paths["safe-atmosphere.webp"], format="WEBP", quality=88, method=6, exact=True)
    return paths


def add_manifest_entry(entries: list[dict[str, object]], root: Path, name: str, kind: str, expected: str) -> None:
    path = root / name
    entries.append(
        {
            "file": name,
            "kind": kind,
            "expected": expected,
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
        }
    )


def generate(output: Path) -> None:
    if output.exists():
        for child in output.iterdir():
            if child.is_dir():
                raise SystemExit(f"Refusing to replace unexpected fixture subdirectory: {child}")
            child.unlink()
    else:
        output.mkdir(parents=True)

    (output / "campaign.txt").write_text(TEXT_SOURCE, encoding="utf-8", newline="\n")
    (output / "campaign.md").write_text(MARKDOWN_SOURCE, encoding="utf-8", newline="\n")

    image_paths = write_safe_images(output)
    valid_pdf = output / "valid-text.pdf"
    write_text_pdf(valid_pdf)
    write_blank_pdf(output / "empty.pdf")
    write_image_only_pdf(output / "image-only.pdf", image_paths["safe-atmosphere.png"])
    rewrite_pdf(valid_pdf, output / "encrypted.pdf", password="phase-g-fixture")
    rewrite_pdf(valid_pdf, output / "active-content.pdf", javascript=True)
    rewrite_pdf(valid_pdf, output / "embedded-file.pdf", attachment=True)
    write_page_limit_pdf(output / "over-page-limit.pdf")

    valid_bytes = valid_pdf.read_bytes()
    (output / "malformed-truncated.pdf").write_bytes(valid_bytes[: max(32, len(valid_bytes) // 3)])
    (output / "oversized-file.pdf").write_bytes(valid_bytes + b"\n%" + (b"RELIC-PHASE-G-FILLER\n" * 550_000))
    (output / "pdf-disguised-as-text.txt").write_bytes(valid_bytes)
    (output / "png-disguised-as-pdf.pdf").write_bytes(image_paths["safe-atmosphere.png"].read_bytes())
    (output / "polyglot.pdf").write_bytes(valid_bytes + b"\n" + image_paths["safe-atmosphere.png"].read_bytes())
    (output / "malformed-image.png").write_bytes(b"\x89PNG\r\n\x1a\nsynthetic-truncated-image")
    Image.new("1", (10_000, 10_000), 0).save(output / "oversized-dimensions.png", format="PNG", optimize=False, compress_level=9)

    entries: list[dict[str, object]] = []
    matrix = (
        ("campaign.txt", "text", "ready"),
        ("campaign.md", "markdown", "ready"),
        ("valid-text.pdf", "pdf", "ready"),
        ("empty.pdf", "pdf", "no_extractable_text"),
        ("image-only.pdf", "pdf", "no_extractable_text"),
        ("encrypted.pdf", "pdf", "encrypted_pdf"),
        ("active-content.pdf", "pdf", "active_content_rejected"),
        ("embedded-file.pdf", "pdf", "embedded_file_rejected"),
        ("over-page-limit.pdf", "pdf", "page_limit_exceeded"),
        ("oversized-file.pdf", "pdf", "file_size_limit_exceeded"),
        ("malformed-truncated.pdf", "pdf", "malformed_pdf"),
        ("pdf-disguised-as-text.txt", "mime_mismatch", "mime_mismatch"),
        ("png-disguised-as-pdf.pdf", "mime_mismatch", "mime_mismatch"),
        ("polyglot.pdf", "pdf_polyglot", "malformed_pdf"),
        ("safe-atmosphere.jpg", "image", "ready_private_attachment"),
        ("safe-atmosphere.png", "image", "ready_private_attachment"),
        ("safe-atmosphere.webp", "image", "ready_private_attachment"),
        ("malformed-image.png", "image", "malformed_image"),
        ("oversized-dimensions.png", "image", "image_dimensions_exceeded"),
    )
    for name, kind, expected in matrix:
        add_manifest_entry(entries, output, name, kind, expected)

    manifest = {
        "fixture_set": "phase-g-import-attachments-v1",
        "synthetic": True,
        "contains_private_data": False,
        "encrypted_pdf_password": "phase-g-fixture",
        "files": entries,
    }
    (output / "manifest.json").write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(".tmp/phase-g-fixtures"),
        help="Generated fixture directory (replaced on each run).",
    )
    args = parser.parse_args()
    generate(args.output.resolve())
    print(args.output.resolve())


if __name__ == "__main__":
    main()
