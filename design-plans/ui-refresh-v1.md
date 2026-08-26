# Quiet Graphite Workbench UI Reconciliation

> Historical implementation plan. The former `DiffInspector` surface referenced below was retired after implementation; current Diff presentation is owned by the conversation timeline and `diff-status.md`.

Written against: the current production worktree on 2026-08-17

## Implementation status

The migration described here is implemented in the current worktree. The broader design-system audit was also completed rather than leaving the accepted screens on top of a legacy cascade:

- meaningful production text now starts at `--text-meta` (`11px/16px`); direct `7–10px` declarations are absent;
- feature CSS consumes semantic color tokens; literal palette values are owned by `src/styles/tokens.css`, including the quantitative context-usage scale;
- the former end-of-file `Quiet Graphite` and `Final composer` override layers were folded into their owning selectors and removed;
- standard operations and activity markers use Lucide at `16px / 1.75px` rather than Unicode/text glyphs;
- component geometry uses the documented `4px / 6px / 8px` radius roles;
- layout behavior now follows the `1180px` and `900px` region contract with inspector/sidebar overlays instead of hiding the regions;
- `App.tsx` is a 334-line view coordinator, `useAppController.ts` owns the 490-line state/command orchestration, and `App.css` is below 500 lines after feature styles moved to their owners.

The original findings below remain as the evidence and intended migration path; their described defects no longer represent the current implementation.

## Design language

- Audited surface: the primary workbench conversation timeline, left Session history, and model advanced-settings dialog.
- Design sources: accepted `DESIGN.md`, runtime `src/styles/tokens.css`, rendered reference `design-plans/ui-refresh-v1.html`, the user-provided timeline screenshot, and the current production consumers traced below.
- Documented decisions: conversation text is 15px/24px; process content is 13px/20px; metadata is 11px/16px; Session rows use a fixed 56px stacked layout with a stable right action slot, 14px titles and 11px metadata; assistant output is unframed with a 2px activity line; file references use information blue and success/danger colors only for additions/deletions; meaningful text never falls below 11px.
- Governing owners and consumers: `src/styles/tokens.css` owns the scale and palette; feature CSS owns explorer, command, runtime, attachment, interaction, Diff, and timeline presentation; `App.css` owns only shared workbench/layout presentation; `ConversationTurn.tsx`, `TurnActivityGroup.tsx`, `TurnFileChanges.tsx`, `ThreadHistoryList.tsx`, and `ModelSettingsPanel.tsx` own behavior and structure.
- Explicit exceptions: code, file paths, durations, and identifiers use the mono family; conversation prose uses the UI family.

## Findings

| # | Problem | Evidence | Proposed change | Scope | Confidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Timeline typography and semantic color only partially match the accepted design | The main answer already resolves to 15px/24px, but `TurnFileChanges` still resolves labels and paths to 11px, uses the `±` text glyph, and relies on legacy local colors; process/file separators use `#302f29` rather than `--border-subtle`. The accepted prototype specifies 13px/20px process content, 12px file rows, blue file icons, green additions, red deletions, and token-owned separators. | Keep answer text at 15px/24px, normalize process/file content to the documented roles, replace the file glyph with the existing Lucide icon language, and consume semantic tokens for separators and file states. | Conversation timeline, collapsed process group, completed file summary, message metadata | High |
| 2 | Session history text is undersized and its state palette drifts from the workbench contract | The former 40px row and inherited list typography allowed stacked title/time content to clip; running/pin/branch styles also drifted from semantic tokens. `DESIGN.md` now requires a 56px stacked row, 14px title, 11px metadata, token-owned selected/hover states, and a stable right action slot without a decorative mask. | Assign title and metadata roles explicitly, preserve fixed row geometry and the independent action slot, hide the native scrollbar gutter, and keep row surfaces continuous while only the buttons receive local backgrounds. | Active, pinned, running, branched, long-title, and right-click Session rows | High |
| 3 | Model advanced settings remains on a legacy modal scale and palette | `.settings-modal` uses a 16px radius and hardcoded brown surfaces/borders; field labels are 10px, help text 9px, inputs 11px, and the heading is 19px. These values contradict the 11px minimum, 12/13/14px UI roles, 8px panel radius, and graphite semantic surfaces in `DESIGN.md`. | Restyle the existing dialog with the current token scale: 14px title, 13px fields/inputs, 11px descriptions, 8px modal radius, graphite surfaces, semantic focus ring, and existing button variants. | Gateway URL, API key, custom model ID, provider capability summary, verbosity selector, error state, footer actions | High |

## Improve first

Reconcile the timeline first. It is the primary reading surface, the main prose scale is already correct, and the remaining work is a bounded migration of process/file typography, separators, icons, and semantic state colors without changing message ordering or app-server behavior.

## Design decision

Complete the accepted Quiet Graphite Workbench migration through existing owners rather than introduce a second component system. Use the exact type/color/geometry roles already present in `src/styles/tokens.css`; treat `ui-refresh-v1.html` as a visual exemplar only. The three stages are independently reviewable and must not change Session ordering, model persistence, message grouping, queue/steer, or app-server event semantics.

## Reuse

- `--text-conversation`, `--text-conversation-small`, `--text-ui`, `--text-label`, and `--text-meta` from `src/styles/tokens.css`.
- `--text-primary`, `--text-secondary`, `--text-muted`, `--accent-info`, `--accent-success`, `--accent-danger`, and graphite surface/border tokens.
- Existing Lucide dependency and icon geometry: 16px, 1.75px stroke, `currentColor`.
- Existing behavior owners: `ConversationTurn`, `TurnActivityGroup`, `TurnFileChanges`, `ThreadHistoryList`, and `ModelSettingsPanel`.
- Exemplar: the assistant turn, process group, file changes, Session list, and dialog rules in `design-plans/ui-refresh-v1.html`.

No new behavior primitive is required. Shared CSS utilities are justified only where they replace an effective legacy selector without changing markup ownership.

## Changes

1. `src/App.css`, `src/features/threads/ConversationTimeline.css`, `src/features/threads/TurnFileChanges.tsx`
   - Change: keep assistant prose at 15px/24px and the 2px activity line; set process summaries/details to 13px/20px; set metadata to 11px/16px with tabular numbers and at least 6px separation; use `--border-subtle` for process/file separators; present file rows at 12px mono with an information-blue file icon and semantic addition/deletion counts.
   - Preserve: timeline virtualization, raw app-server order, completed-process folding, command drawers, answer streaming, copy/fork controls, file aggregation, and Diff counts.
   - Verify: the screenshot hierarchy is reproduced without adding cards around assistant responses or changing the placement of user messages and queued Composer rows.

2. `src/App.css`, `src/features/threads/ThreadHistoryList.tsx`
   - Change: make `.thread-title` explicitly 14px/20px and row metadata 11px/16px; keep 56px rows; use token-owned selected, hover, running, pinned, and branch colors; keep the right action slot independent without a fade or mask, and hide only the native scrollbar gutter.
   - Preserve: pinned-first ordering, branch depth, active/running state, archive/delete behavior, context menu, tooltips, and click target geometry.
   - Verify: long Chinese/Latin names do not overlap actions and title/metadata baselines remain stable on hover.

3. `src/App.css`, `src/features/models/ModelSettingsPanel.tsx`
   - Change: migrate the dialog to token-owned graphite surfaces and an 8px radius; use a 14px/20px title, 13px/20px field labels and inputs, and 11px/16px descriptions/status; replace the `×` close glyph with the existing Lucide close icon; use the established focus ring and primary/secondary button geometry.
   - Preserve: Windows Credential Manager handling, hidden API key, validation, provider capability read, restart decision, verbosity selection, cancel/outside-click behavior, and save behavior.
   - Verify: long Base URLs/model IDs remain readable, help text never drops below 11px, and validation does not resize or obscure footer actions.

4. Tests and status documentation
   - Change: extend DOM tests only where markup/icon replacement changes observable structure; update `docs/status/ui-shell-status.md` and `docs/status/PROJECT_STATUS.md` after each implemented stage, not during planning.
   - Preserve: current behavioral assertions.
   - Verify: no generated app-server types or protocol code change.

## Scope

- Inherit: all timeline turns, Session history states, and model advanced-settings states that consume the effective selectors above.
- Verify: empty/active/completed/failed turns, long Markdown, process groups, file changes, long Session titles, pinned/running rows, default/custom provider settings, validation errors, and four target viewport sizes.
- Exclude: app-server event semantics, Session identity/order, model/provider behavior, queue/steer logic, Composer workspace behavior, inspector, Diff implementation, and light theme.

## Validation

- Product: run a multi-step task that produces commentary, commands, a final answer, and file changes; pin/open a long Session; open model advanced settings with default and custom provider values.
- Interface: compare at `1440x900`, `1280x780`, `1024x720`, and `900x700`; verify Chinese/Latin baselines, line wrapping, metadata spacing, long paths, button-only hover actions, keyboard focus, scrolling without a visible scrollbar gutter, and validation states.
- System: confirm every new effective value resolves through `src/styles/tokens.css` and no parallel palette/type scale is introduced.
- Repository: `pnpm test:quality` → all TypeScript, Vitest, build, Knip, Rust, Clippy, and diff checks pass; `pnpm desktop:build` → debug desktop binary builds successfully.

## Stop conditions

- Stop if a visual change requires changing app-server payloads, event order, Session sorting, model persistence, queue/steer behavior, or credential handling.
- Stop and split the implementation if any stage exceeds roughly 300 non-mechanical changed lines.
- Stop if a shared primitive would move business behavior out of the existing feature owner.

## Design documentation

- After implementation and visual validation, update `docs/status/ui-shell-status.md` and `docs/status/PROJECT_STATUS.md` with the completed stages.
- `DESIGN.md` already contains the governing decisions; do not change it unless implementation proves a reusable rule must change.
