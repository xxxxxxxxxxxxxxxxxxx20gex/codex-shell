import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  children: string;
  className?: string;
}

function safeUrlTransform(url: string) {
  if (/^(?:https?:|mailto:|#|\/)/i.test(url)) return defaultUrlTransform(url);
  return "";
}

export function MarkdownContent({ children, className }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={safeUrlTransform}
        components={{
          a: ({ children: label, ...props }) => <a {...props} target="_blank" rel="noreferrer">{label}</a>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
