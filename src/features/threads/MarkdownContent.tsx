import { openUrl } from "@tauri-apps/plugin-opener";
import { File } from "lucide-react";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { errorMessage } from "../../shared/errors";
import { MarkdownCodeBlock } from "./MarkdownCodeBlock";
import { MarkdownTable } from "./MarkdownTable";
import "./MarkdownContent.css";

interface Props {
  children: string;
  className?: string;
  onOpenPath?: (path: string) => void | Promise<void>;
  onOpenError?: (message: string) => void;
}

type LinkTarget =
  | { type: "external"; value: string }
  | { type: "localPath"; value: string }
  | { type: "fragment"; value: string };

function decodeLinkValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stripLineReference(path: string) {
  return path.replace(/#L\d+(?:C\d+)?$/i, "").replace(/:\d+(?::\d+)?$/, "");
}

function fileUrlPath(href: string) {
  try {
    const url = new URL(href);
    let path = decodeLinkValue(url.pathname);
    if (/^\/[a-zA-Z]:\//.test(path)) path = path.slice(1);
    if (url.hostname && url.hostname !== "localhost") {
      path = `\\\\${url.hostname}${path.replace(/\//g, "\\")}`;
    }
    return stripLineReference(path);
  } catch {
    return null;
  }
}

export function markdownLinkTarget(href: string): LinkTarget | null {
  const value = href.trim().replace(/^\/([a-zA-Z]:[\\/])/, "$1");
  if (!value) return null;
  if (value.startsWith("#")) return { type: "fragment", value };
  if (/^(?:https?:|mailto:|tel:)/i.test(value)) return { type: "external", value };
  if (/^file:/i.test(value)) {
    const path = fileUrlPath(value);
    return path ? { type: "localPath", value: path } : null;
  }
  if (/^[a-zA-Z]:[\\/]/.test(value) || value.startsWith("\\\\")) {
    return { type: "localPath", value: stripLineReference(decodeLinkValue(value)) };
  }
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) return null;
  return { type: "localPath", value: stripLineReference(decodeLinkValue(value)) };
}

export function localResourcePath(path: string) {
  if (!/^file:/i.test(path)) return path;
  const target = markdownLinkTarget(path);
  return target?.type === "localPath" && /^(?:[a-zA-Z]:[\\/]|\\\\)/.test(target.value) ? target.value : null;
}

function safeUrlTransform(url: string) {
  const target = markdownLinkTarget(url);
  if (!target) return "";
  return target.type === "localPath" ? url : defaultUrlTransform(url);
}

// Convert image syntax before rendering so linked images do not produce nested links.
function remarkImageLinks() {
  type Node = { type: string; url?: string; alt?: string; children?: Node[]; value?: string };
  return (tree: Node) => {
    function visit(node: Node, inLink = false) {
      node.children = node.children?.map((child) => {
        if (child.type === "image" || child.type === "imageReference") {
          const label = { type: "text", value: child.alt || "打开图片" };
          return inLink ? label : { ...child, type: child.type === "image" ? "link" : "linkReference", children: [label] };
        }
        visit(child, inLink || child.type === "link" || child.type === "linkReference");
        return child;
      });
    }
    visit(tree);
  };
}

export function MarkdownContent({ children, className, onOpenPath, onOpenError }: Props) {
  async function openLink(href: string) {
    const target = markdownLinkTarget(href);
    if (!target || target.type === "fragment") return;
    try {
      if (target.type === "external") await openUrl(target.value);
      else if (onOpenPath) await onOpenPath(target.value);
      else throw new Error("当前界面未配置本机文件跳转");
    } catch (error) {
      onOpenError?.(errorMessage(error));
    }
  }

  return (
    <div className={["markdown-content", className].filter(Boolean).join(" ")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkImageLinks]}
        skipHtml
        urlTransform={safeUrlTransform}
        components={{
          table: ({ children: cells }) => <MarkdownTable>{cells}</MarkdownTable>,
          img: ({ alt }) => <span>{alt || "图片"}</span>,
          pre: ({ children: codeElement }) => {
            if (!isValidElement(codeElement)) return <pre>{codeElement}</pre>;
            return <MarkdownCodeBlock codeElement={codeElement as ReactElement<{ children?: ReactNode; className?: string }>} />;
          },
          a: ({ children: label, href, ...props }) => {
            const target = href ? markdownLinkTarget(href) : null;
            if (!href || !target) return <span>{label}</span>;
            return (
              <a
                {...props}
                href={href}
                data-local-path={target.type === "localPath" ? target.value : undefined}
                target={target.type === "external" ? "_blank" : undefined}
                rel={target.type === "external" ? "noreferrer" : undefined}
                onClick={(event) => {
                  if (target.type === "fragment") return;
                  event.preventDefault();
                  void openLink(href);
                }}
              >
                {target.type === "localPath" && <File className="markdown-file-icon" aria-hidden="true" />}
                {label}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
