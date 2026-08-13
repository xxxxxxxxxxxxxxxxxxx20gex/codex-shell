import type { UserInput } from "../../generated/app-server/v2/UserInput";

export interface FileMention {
  name: string;
  path: string;
}

export interface SkillMention {
  name: string;
  path: string;
}

export interface ImageAttachment {
  name: string;
  path?: string;
  url?: string;
}

export function buildUserInput(
  message: string,
  mentions: FileMention[],
  skills: SkillMention[],
  images: ImageAttachment[] = [],
): UserInput[] {
  return [
    { type: "text", text: message, text_elements: [] },
    ...skills.map((skill) => ({ type: "skill" as const, name: skill.name, path: skill.path })),
    ...mentions.map((mention) => ({ type: "mention" as const, name: mention.name, path: mention.path })),
    ...images.map((image) => image.path
      ? { type: "localImage" as const, path: image.path }
      : { type: "image" as const, url: image.url ?? "" }),
  ];
}
