---
name: cs-documents
description: Create, edit, and verify local DOCX Word documents. Use when the requested input or deliverable is DOCX; do not use for PDF or spreadsheet work.
---

# Documents

Create and edit local `.docx` files while preserving readable structure and existing document intent. Preserve the source file unless the user explicitly asks to replace it.

## Dependencies

Before file work, resolve this Skill directory and run `../../scripts/check_dependencies.py documents` with an available Python 3 interpreter. Use `python-docx` for normal authoring and `lxml` only when a requested OOXML feature is not exposed by `python-docx`. LibreOffice and Poppler enable visual verification. Do not install missing software without the user's authorization; report the exact missing dependency.

## Workflow

- Inspect an existing document before editing. Preserve sections, styles, tables, headers, footers, relationships, and numbering that are outside the requested change.
- Use semantic Word styles for titles and headings. Keep typography, spacing, margins, tables, and page breaks consistent with the document's audience and any supplied reference.
- Prefer `python-docx` for creation and ordinary edits. Use direct OOXML changes only for a concrete unsupported feature, and keep the affected XML scope narrow.
- Do not claim support for macros, signatures, tracked changes, comments, fields, or content controls unless the requested feature was explicitly implemented and verified. Preserve unsupported structures where possible.
- Reopen the final DOCX with `python-docx`, verify the ZIP package, expected paragraphs, tables, sections, and non-empty media relationships.
- When LibreOffice and Poppler are available, convert a copy to PDF, render every page to PNG, and inspect for clipping, overlap, missing glyphs, broken tables, and unintended blank pages.
- If rendering dependencies are unavailable, report that only structural validation was completed. Never describe the document as visually verified.
- Keep QA files temporary and return only the requested DOCX unless the user asks for other formats.
