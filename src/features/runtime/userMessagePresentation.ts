import type { ThreadItem } from "../../generated/app-server/v2/ThreadItem";
import type { TextElement } from "../../generated/app-server/v2/TextElement";
import { ATTACHED_FILES_HEADING, type FileMention, type ImageAttachment } from "./sessionInput";

export interface UserMessagePresentation {
  text: string;
  files: FileMention[];
  images: ImageAttachment[];
}

function utf8Slice(value: string, start: number, end: number) {
  const bytes = new TextEncoder().encode(value);
  return new TextDecoder().decode(bytes.slice(start, end));
}

function isAbsoluteLocalPath(path: string) {
  return /^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(path);
}

function textPresentation(text: string, elements: TextElement[]) {
  const marker = `${ATTACHED_FILES_HEADING}\n`;
  const markerIndex = text.lastIndexOf(marker);
  if (markerIndex < 0 || elements.length === 0) return { text, files: [] as FileMention[] };
  const files = elements.flatMap((element) => {
    const path = utf8Slice(text, element.byteRange.start, element.byteRange.end).trim();
    return path ? [{ name: element.placeholder || path.split(/[\\/]/).pop() || path, path }] : [];
  });
  const visibleTextEnd = markerIndex >= 2 && text.slice(markerIndex - 2, markerIndex) === "\n\n"
    ? markerIndex - 2
    : markerIndex;
  return files.length > 0 ? { text: text.slice(0, visibleTextEnd), files } : { text, files };
}

export function userMessagePresentation(item: ThreadItem): UserMessagePresentation {
  if (item.type !== "userMessage") return { text: "", files: [], images: [] };
  const textParts: string[] = [];
  const files: FileMention[] = [];
  const images: ImageAttachment[] = [];
  item.content.forEach((content) => {
    if (content.type === "text") {
      const presentation = textPresentation(content.text, content.text_elements);
      if (presentation.text) textParts.push(presentation.text);
      files.push(...presentation.files);
    } else if (content.type === "localImage") {
      const path = String(content.path);
      images.push({ name: path.split(/[\\/]/).pop() || path, path });
    } else if (content.type === "image") {
      images.push({ name: `图片 ${images.length + 1}`, url: content.url });
    } else if (content.type === "mention" && isAbsoluteLocalPath(content.path)) {
      files.push({ name: content.name, path: content.path });
    }
  });
  return { text: textParts.join("\n"), files, images };
}
