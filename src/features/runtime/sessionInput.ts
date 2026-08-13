import type { UserInput } from "../../generated/app-server/v2/UserInput";

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
