import { describe, expect, it } from "vitest";
import { activeSlashCommandQuery, matchingSlashCommands, parseSlashCommand } from "./slashCommands";

describe("slash command parsing", () => {
  it("opens the menu only for a leading command token", () => {
    expect(activeSlashCommandQuery("/")).toBe("");
    expect(activeSlashCommandQuery("/ski")).toBe("ski");
    expect(activeSlashCommandQuery("hello /ski")).toBeNull();
    expect(activeSlashCommandQuery("/goal objective")).toBeNull();
  });

  it("filters and parses supported commands", () => {
    expect(matchingSlashCommands("ski").map((command) => command.id)).toEqual(["skills"]);
    expect(parseSlashCommand("/goal build the app")).toEqual({ id: "goal", args: "build the app" });
    expect(parseSlashCommand("/unknown")).toBeNull();
  });
});
