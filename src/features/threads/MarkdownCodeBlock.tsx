import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { writeClipboardText } from "./clipboard";

interface CodeElementProps {
  children?: ReactNode;
  className?: string;
}

interface Props {
  codeElement: ReactElement<CodeElementProps>;
}

const LANGUAGE_LABELS: Record<string, string> = {
  bash: "Bash",
  css: "CSS",
  html: "HTML",
  javascript: "JavaScript",
  js: "JavaScript",
  json: "JSON",
  markdown: "Markdown",
  md: "Markdown",
  plaintext: "纯文本",
  powershell: "PowerShell",
  ps1: "PowerShell",
  python: "Python",
  py: "Python",
  rust: "Rust",
  shell: "Shell",
  sql: "SQL",
  text: "纯文本",
  toml: "TOML",
  ts: "TypeScript",
  tsx: "TSX",
  typescript: "TypeScript",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
};

function codeLanguage(className?: string) {
  const language = className?.match(/(?:^|\s)language-([^\s]+)/i)?.[1]?.toLocaleLowerCase();
  if (!language) return "纯文本";
  return LANGUAGE_LABELS[language] ?? language;
}

export function MarkdownCodeBlock({ codeElement }: Props) {
  const [copied, setCopied] = useState(false);
  const code = String(codeElement.props.children ?? "").replace(/\n$/, "");

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1_800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copyCode() {
    try {
      await writeClipboardText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="markdown-code-block">
      <header>
        <span>{codeLanguage(codeElement.props.className)}</span>
        <button
          type="button"
          onClick={() => void copyCode()}
          aria-label={copied ? "已复制代码" : "复制代码"}
          title={copied ? "已复制" : "复制"}
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        </button>
      </header>
      <pre><code className={codeElement.props.className}>{code}</code></pre>
    </section>
  );
}
