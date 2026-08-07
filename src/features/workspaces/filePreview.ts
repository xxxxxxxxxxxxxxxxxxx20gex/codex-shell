const MAX_TEXT_BYTES = 200_000;
const MAX_TEXT_LINES = 4_000;

const IMAGE_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export type FilePreview =
  | { kind: "text"; content: string; byteSize: number; truncated: boolean }
  | { kind: "image"; dataUrl: string; byteSize: number }
  | { kind: "binary"; byteSize: number };

function extension(path: string) {
  const match = /\.[^.\\/]+$/.exec(path);
  return match?.[0].toLowerCase() ?? "";
}

function decodedSize(dataBase64: string) {
  const padding = dataBase64.endsWith("==") ? 2 : dataBase64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor(dataBase64.length * 3 / 4) - padding);
}

function decodePrefix(dataBase64: string) {
  const base64Length = Math.ceil(MAX_TEXT_BYTES / 3) * 4;
  const binary = atob(dataBase64.slice(0, base64Length));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function decodeFilePreview(path: string, dataBase64: string): FilePreview {
  const byteSize = decodedSize(dataBase64);
  const imageType = IMAGE_TYPES[extension(path)];
  if (imageType) return { kind: "image", dataUrl: `data:${imageType};base64,${dataBase64}`, byteSize };

  const bytes = decodePrefix(dataBase64);
  if (bytes.some((byte) => byte === 0)) return { kind: "binary", byteSize };
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const lines = decoded.split(/\r?\n/);
  const lineTruncated = lines.length > MAX_TEXT_LINES;
  const content = (lineTruncated ? lines.slice(0, MAX_TEXT_LINES) : lines).join("\n");
  return {
    kind: "text",
    content,
    byteSize,
    truncated: byteSize > bytes.length || lineTruncated,
  };
}

export function formatFileSize(byteSize: number) {
  if (byteSize < 1_024) return `${byteSize} B`;
  if (byteSize < 1_048_576) return `${(byteSize / 1_024).toFixed(1)} KB`;
  return `${(byteSize / 1_048_576).toFixed(1)} MB`;
}
