"""Render local Office/PDF files without modifying the source or using Codex services."""

import argparse
import json
from pathlib import Path
import shutil
import subprocess
import tempfile


def render(source: Path, output: Path, soffice: str | None = None) -> dict:
    import pymupdf

    source = source.resolve(strict=True)
    if source.suffix.lower() not in {".pdf", ".docx", ".pptx", ".xlsx", ".xlsm"}:
        raise ValueError("仅支持 PDF、DOCX、PPTX、XLSX 和 XLSM")
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        raise ValueError("预览目录必须不存在或为空，避免混入旧页面或覆盖文件")
    output.mkdir(parents=True, exist_ok=True)
    output = output.resolve()
    pdf = source
    if source.suffix.lower() != ".pdf":
        executable = soffice or shutil.which("soffice")
        if not executable or not Path(executable).is_file():
            raise FileNotFoundError("未找到 LibreOffice，请通过 PATH 或 --soffice 指定")
        with tempfile.TemporaryDirectory(prefix="cs-office-render-") as temporary:
            profile = Path(temporary) / "profile"
            profile.mkdir()
            # A private profile prevents attaching to a live office session.
            (profile / "user").mkdir()
            (profile / "user/registrymodifications.xcu").write_text(
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<oor:items xmlns:oor="http://openoffice.org/2001/registry">'
                '<item oor:path="/org.openoffice.Office.Common/Security/Scripting">'
                '<prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop>'
                '</item></oor:items>', encoding="utf-8")
            result = subprocess.run(
                [str(executable), f"-env:UserInstallation={profile.as_uri()}",
                 "--headless", "--nologo", "--nodefault", "--norestore",
                 "--convert-to", "pdf", "--outdir", str(output), str(source)],
                capture_output=True, timeout=120, check=False,
            )
            pdf = output / f"{source.stem}.pdf"
            if result.returncode != 0 or not pdf.is_file():
                detail = (result.stderr or result.stdout).decode("utf-8", errors="replace")
                raise RuntimeError(f"LibreOffice 转换失败：{detail[-2000:]}")
    pages = []
    with pymupdf.open(pdf) as document:
        if document.needs_pass or len(document) == 0:
            raise ValueError("PDF 加密或没有可渲染页面")
        for index, page in enumerate(document):
            path = output / f"page-{index + 1}.png"
            page.get_pixmap(dpi=144, alpha=False).save(path)
            pages.append(str(path))
    return {"pdf": str(pdf), "pages": pages}


def main() -> None:
    parser = argparse.ArgumentParser(description="将本地办公文件渲染为页面 PNG")
    parser.add_argument("source", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--soffice")
    args = parser.parse_args()
    print(json.dumps(render(args.source, args.output_dir, args.soffice), ensure_ascii=True))


if __name__ == "__main__":
    main()
