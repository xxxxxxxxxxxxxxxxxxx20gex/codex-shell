"""Create a reference-backed personal CS Skill; never overwrite an existing template."""

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import tempfile


def create_template(reference: Path, preview: Path, name: str, display_name: str,
                    description: str, instructions: str = "") -> Path:
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name) or len(name) > 48:
        raise ValueError("模板名需为不超过 48 字符的小写字母、数字和连字符")
    if not display_name.strip() or not description.strip():
        raise ValueError("模板显示名称和用途不能为空")
    reference = reference.resolve(strict=True)
    preview = preview.resolve(strict=True)
    if reference.suffix.lower() not in {".docx", ".pptx", ".xlsx", ".pdf"}:
        raise ValueError("模板参考仅支持 DOCX、PPTX、XLSX 和 PDF")
    with preview.open("rb") as stream:
        if stream.read(8) != b"\x89PNG\r\n\x1a\n":
            raise ValueError("预览必须为已检查的 PNG 文件")
    home_value = os.environ.get("CODEX_HOME")
    if not home_value or not Path(home_value).is_absolute():
        raise ValueError("需要当前 CS 的绝对 CODEX_HOME，不回退到官方 Codex 目录")
    home = Path(home_value).resolve()
    if home == (Path.home() / ".codex").resolve():
        raise ValueError("不能将 CS 模板写入官方 Codex 用户目录")
    skills = home / "skills"
    skills.mkdir(parents=True, exist_ok=True)
    if skills.is_symlink() or skills.resolve().parent != home:
        raise ValueError("个人 Skill 目录不能重定向到其他目录")
    skill_name = f"cs-template-{name}"
    target = skills / skill_name
    if target.exists():
        raise FileExistsError(f"模板已存在，不覆盖：{target}")
    with tempfile.TemporaryDirectory(prefix=".cs-template-", dir=skills) as temporary:
        staging = Path(temporary) / skill_name
        (staging / "assets").mkdir(parents=True)
        (staging / "agents").mkdir()
        reference_name = f"reference{reference.suffix.lower()}"
        shutil.copy2(reference, staging / "assets" / reference_name)
        shutil.copy2(preview, staging / "assets/preview.png")
        quote = lambda value: json.dumps(value, ensure_ascii=False)
        body = (f"---\nname: {skill_name}\ndescription: {quote(description.strip())}\n---\n\n"
                f"# {display_name.strip()}\n\n"
                f"使用 [参考原件](assets/{reference_name}) 和 [预览](assets/preview.png)。\n"
                "先复制原件到任务输出目录，再用相应办公 Skill 按用户需求编辑和验证。\n"
                "保留参考的结构和视觉约束，不把样例事实当作新任务事实；不修改模板内原件。\n"
                "PDF 仅作为参考，不承诺可编辑；交付前分别检查内容、结构和渲染。\n\n"
                + instructions.strip() + "\n")
        (staging / "SKILL.md").write_text(body, encoding="utf-8")
        (staging / "agents/openai.yaml").write_text(
            f"interface:\n  display_name: {quote(display_name.strip())}\n"
            f"  short_description: {quote(description.strip())}\n"
            f"  default_prompt: {quote(f'使用 ${skill_name} 创建符合参考样式的文件。')}\n",
            encoding="utf-8")
        staging.rename(target)
    return target


def main() -> None:
    parser = argparse.ArgumentParser(description="创建 CS 个人办公模板 Skill")
    parser.add_argument("--reference", type=Path, required=True)
    parser.add_argument("--preview", type=Path, required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--display-name", required=True)
    parser.add_argument("--description", required=True)
    parser.add_argument("--instructions-file", type=Path)
    args = parser.parse_args()
    instructions = args.instructions_file.read_text(encoding="utf-8") if args.instructions_file else ""
    path = create_template(args.reference, args.preview, args.name,
                           args.display_name, args.description, instructions)
    print(json.dumps({"skillName": path.name, "path": str(path)}, ensure_ascii=True))


if __name__ == "__main__":
    main()
