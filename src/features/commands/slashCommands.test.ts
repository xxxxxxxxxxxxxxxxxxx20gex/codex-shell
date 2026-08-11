import { describe, expect, it } from "vitest";
import { activeSlashCommandQuery, matchingSlashCommands, parseSlashCommand } from "./slashCommands";
import { commandDisabled } from "./SlashCommandMenu";

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
    expect(parseSlashCommand("/plan migrate the database")).toEqual({ id: "plan", args: "migrate the database" });
    expect(parseSlashCommand("/review focus on lifecycle leaks")).toEqual({ id: "review", args: "focus on lifecycle leaks" });
    expect(parseSlashCommand("/unknown")).toBeNull();
  });

  it("enables plan mode while idle and blocks switching during a running turn", () => {
    const plan = matchingSlashCommands("plan")[0];

    expect(plan).toMatchObject({ id: "plan", blockedWhileRunning: true });
    expect(commandDisabled(plan, false, false)).toBe(false);
    expect(commandDisabled(plan, true, true)).toBe(true);
  });
});
