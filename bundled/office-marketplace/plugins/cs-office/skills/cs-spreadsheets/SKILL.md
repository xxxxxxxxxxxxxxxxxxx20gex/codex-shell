---
name: cs-spreadsheets
description: Create, edit, analyze, and verify local XLSX, XLSM, CSV, and TSV files. Use for standalone spreadsheet files; do not use for live control of an open Excel application.
---

# Spreadsheets

Work on standalone local spreadsheet files. This Skill does not connect to the ChatGPT Excel add-in or control a live Excel session.

## Dependencies

Before workbook work, resolve this Skill directory and run `../../scripts/check_dependencies.py spreadsheets` with an available Python 3 interpreter. Use `openpyxl` for XLSX/XLSM and the Python standard library for CSV/TSV. LibreOffice enables rendered verification. Do not install missing software without the user's authorization; report the exact missing dependency.

## Workflow

- Inspect existing sheet names, dimensions, formulas, styles, merged cells, tables, charts, validations, hidden state, freeze panes, and print settings before editing.
- Preserve formulas as formulas and keep calculations auditable. `openpyxl` does not calculate formulas, so do not claim recalculated values unless a spreadsheet engine actually recalculated the workbook.
- Use formulas for derived values when users are expected to continue editing the workbook. Keep raw inputs separate from derived summaries when the task benefits from that distinction.
- Use stable headers, appropriate number formats, readable column widths, filters, and freeze panes. Avoid decorative dashboards unless requested.
- Preserve VBA in `.xlsm` by loading and saving with `keep_vba=True`; do not create, edit, or execute macros unless explicitly requested and separately authorized.
- Reopen the written workbook with `data_only=False` and verify expected sheets, formulas, cell types, tables, charts, and validations. For CSV/TSV, verify encoding, delimiter, row widths, and round-trip parsing.
- When LibreOffice is available, recalculate a temporary copy when appropriate, export relevant sheets to PDF, and inspect the rendered pages for truncation, overflow, unreadable scaling, and blank output.
- If rendering or recalculation is unavailable, state that limitation and distinguish structural checks from visual checks.
- Return only the requested workbook or delimited file; do not include temporary exports unless requested.
