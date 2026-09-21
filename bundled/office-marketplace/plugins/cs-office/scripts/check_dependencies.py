import argparse
import importlib.util
import json
import shutil


REQUIRED_MODULES = {
    "pdf": ("pypdf", "pdfplumber", "reportlab"),
    "documents": ("docx", "lxml"),
    "spreadsheets": ("openpyxl",),
    "presentations": ("pptx",),
    "templates": (),
}

OPTIONAL_TOOLS = {
    "pdf": ("pdftoppm", "pdfinfo"),
    "documents": ("soffice", "pdftoppm"),
    "spreadsheets": ("soffice",),
    "presentations": ("soffice",),
    "templates": ("soffice",),
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Check CS Office runtime dependencies.")
    parser.add_argument("mode", choices=sorted(REQUIRED_MODULES))
    args = parser.parse_args()

    modules = {
        name: importlib.util.find_spec(name) is not None
        for name in REQUIRED_MODULES[args.mode]
    }
    tools = {name: shutil.which(name) for name in OPTIONAL_TOOLS[args.mode]}
    print(
        json.dumps(
            {"mode": args.mode, "requiredModules": modules, "optionalTools": tools,
             "renderModules": {"pymupdf": importlib.util.find_spec("pymupdf") is not None}},
            ensure_ascii=True,
        )
    )
    return 0 if all(modules.values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())
