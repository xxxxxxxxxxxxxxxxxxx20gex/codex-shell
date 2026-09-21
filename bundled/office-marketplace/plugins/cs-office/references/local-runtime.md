# 本地运行与渲染

所有路径从当前 Skill/插件目录解析，不使用开发机固定路径。共享脚本位于插件根目录 `scripts/`。可使用 PATH 中的 Python 3、用户已有 Conda 环境或明确选择的虚拟环境；检测和执行必须使用同一个解释器。

先运行 `python <插件目录>/scripts/check_dependencies.py <pdf|documents|spreadsheets|presentations|templates>`。输出分别列出必需模块及可选渲染工具，缺项不等于文件损坏。依赖见 `scripts/requirements.txt`，只在用户已授权安装的范围内安装；CS 不捆绑 Python、LibreOffice 或这些包。

## 页面渲染

```powershell
python '<插件目录>/scripts/render_office.py' '<输入文件>' --output-dir '<新的临时预览目录>'
```

- PDF 使用 PyMuPDF 渲染，不要求 Poppler；也可使用已安装的 Poppler 做独立交叉检查。
- DOCX、PPTX、XLSX、XLSM 先由 LibreOffice 导出 PDF，再由 PyMuPDF 渲染。LibreOffice 从 PATH 发现，或通过 `--soffice '<完整程序路径>'` 显式指定已验证存在的本机安装，不查找官方 Codex 的私有依赖目录。
- 输入只读，输出目录必须不存在或为空。转换使用独立临时用户配置，禁止执行文档宏，不连接用户正在使用的 LibreOffice 实例。
- JSON 输出包含 PDF 与页面 PNG 路径。脚本成功仅证明渲染执行成功，必须实际查看图片才可声称视觉验收。
- 表格采用文件自身打印范围、分页和缩放，不能以打印 PDF 代替全部单元格检查。不会回写公式缓存；重算必须单独在副本中执行并验证。
- 缺少依赖、加密文件、转换超时或无页面时明确失败。不得为绕过错误破坏源文件、执行宏或关闭权限保护。

渲染可能因字体、Office 特性和引擎差异偏离 Microsoft Office。复杂模板应在用户实际使用的 Office 中补充验收。最终产物放在项目输出目录，以绝对路径链接交付；临时预览与中间 PDF 不默认作为交付物。
