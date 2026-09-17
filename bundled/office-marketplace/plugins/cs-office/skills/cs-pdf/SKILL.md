---
name: cs-pdf
description: Read, create, edit, fill, and visually verify local PDF files. Use for PDF deliverables or PDF-specific inspection; do not use for Word documents or spreadsheets.
---

# PDF

Work only on local PDF artifacts. Preserve the source file unless the user explicitly asks to replace it.

## Dependencies

Before file work, resolve this Skill directory and run `../../scripts/check_dependencies.py pdf` with an available Python 3 interpreter. Required Python packages are `pypdf`, `pdfplumber`, and `reportlab`. Poppler's `pdftoppm` and `pdfinfo` are required for visual verification but not for text-only inspection. Do not install missing software without the user's authorization; report the exact missing dependency.

## Workflow

- Use `pdfplumber` for layout-aware text and table extraction, `pypdf` for document structure, metadata, page operations, and AcroForms, and `reportlab` for new PDFs.
- For edits, write to a new output path first. Reopen the result with `pypdf` and verify page count, expected text or fields, and non-empty output.
- Preserve interactive form fields by default. Flatten forms only when explicitly requested. After filling, verify field values after reopening the written file.
- Render the final PDF to PNG with `pdftoppm` and inspect every page when Poppler is available. Check clipping, overlap, missing glyphs, blank pages, and image quality.
- If Poppler is unavailable, distinguish structural validation from visual validation in the response. Never claim the layout was visually verified.
- Keep temporary renders outside the final output directory and remove them after inspection. Return only the requested deliverable unless the user asks for intermediates.
