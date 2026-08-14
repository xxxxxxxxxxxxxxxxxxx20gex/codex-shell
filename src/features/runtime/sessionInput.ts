import type { UserInput } from "../../generated/app-server/v2/UserInput";

export const ATTACHED_FILES_HEADING = "Attached files:";

export interface FileMention {
  name: string;
  path: string;
}

export interface SkillMention {
  name: string;
  path: string;
}

export type ImageAttachment =
  | {
      name: string;
      path: string;
      url?: never;
    }
  | {
      name: string;
      path?: never;
      url: string;
    };

function utf8Length(value: string) {
  return new TextEncoder().encode(value).length;
}

function textInput(message: string, files: FileMention[]): UserInput {
  let text = message;
  const textElements: Extract<UserInput, { type: "text" }>["text_elements"] = [];
  if (files.length > 0) {
    text += `${text ? "\n\n" : ""}${ATTACHED_FILES_HEADING}\n`;
    files.forEach((file, index) => {
      text += "- ";
      const start = utf8Length(text);
      text += file.path;
      textElements.push({
        byteRange: { start, end: utf8Length(text) },
        placeholder: file.name,
      });
      if (index < files.length - 1) text += "\n";
    });
  }
  return { type: "text", text, text_elements: textElements };
}

export function buildUserInput(
  message: string,
  mentions: FileMention[],
  skills: SkillMention[],
  images: ImageAttachment[] = [],
): UserInput[] {
  return [
    textInput(message, mentions),
    ...skills.map((skill) => ({ type: "skill" as const, name: skill.name, path: skill.path })),
    ...images.flatMap((image): UserInput[] => {
      if ("path" in image && typeof image.path === "string") {
        return [{ type: "localImage", path: image.path }];
      }
      if ("url" in image && typeof image.url === "string") {
        return [{ type: "image", url: image.url }];
      }
      return [];
    }),
  ];
}
