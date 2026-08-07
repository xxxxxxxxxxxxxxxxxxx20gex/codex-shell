import type { UserInput } from "../../generated/app-server/v2/UserInput";

export interface FileMention {
  name: string;
  path: string;
}

export interface SkillMention {
  name: string;
  path: string;
}

export function buildUserInput(
  message: string,
  mentions: FileMention[],
  skills: SkillMention[],
): UserInput[] {
  return [
    { type: "text", text: message, text_elements: [] },
    ...skills.map((skill) => ({ type: "skill" as const, name: skill.name, path: skill.path })),
    ...mentions.map((mention) => ({ type: "mention" as const, name: mention.name, path: mention.path })),
  ];
}
