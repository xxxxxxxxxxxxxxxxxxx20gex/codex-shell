# Codex Shell UI Refresh V1

Written against: `c63ca33c43bca6f715cf5854984805f8fd5b8786`

## Design language

- Audited surface: the primary three-region workbench, including session history, conversation timeline, Composer, inspector, menus, and row actions.
- Design sources: the rendered workbench at `1280x780`, `src/App.tsx`, `src/App.css`, `src/styles/tokens.css`, feature-local CSS, user-provided Codex desktop references, and the accepted `DESIGN.md` target contract.
- Documented decisions: quiet, dense, work-focused desktop tooling; no marketing composition, decorative cards, gradients, duplicated control entrances, or meaningful text below 11px.
- Governing owners and consumers: `src/styles/tokens.css`, `src/App.css`, `src/App.tsx`, thread feature components, Composer feature components, runtime inspector surfaces, and Diff inspector surfaces.
- Explicit exceptions: conversation content uses a larger readable scale than operational chrome; code, command, and diff output use a mono family.

## Evidence chain

- Surface: the running main workbench at `1280x780`, represented by `src/App.tsx` and previewed by `design-plans/ui-refresh-v1.html`.
- Problem: the visible workbench renders eight font sizes from 8px to 19px, with 15 visible text elements below 11px; peer actions mix Unicode, text glyphs, local SVGs, and CSS-drawn icons; lists and controls redefine gray values, radii, dimensions, and hover states.
- Design evidence: `src/App.css` contains 21 distinct font-size declarations or token forms, including 74 occurrences of literal 7px, 8px, and 9px values. `src/styles/tokens.css` defines a partial runtime system, while `DESIGN.md` now defines the accepted target contract.
- Owner: global primitives belong in `src/styles/tokens.css`; the high-frequency composition remains in `src/App.tsx` and `src/App.css`; timeline presentation belongs to `src/features/threads/ConversationTimeline.tsx` and `src/features/threads/ConversationTimeline.css`; history belongs to `src/features/threads/ThreadHistoryList.tsx`; Composer controls belong to `src/features/composer/`.
- Scope and affected surfaces: primary shell chrome, history rows, current-thread header, conversation timeline, Composer, inspector, popovers, and destructive confirmations.
- Uncertainty: the design decision is resolved; exact component extraction boundaries must be confirmed against each implementation-stage diff so `App.tsx` is not expanded further.

## Findings

| # | Problem | Evidence | Proposed change | Scope | Confidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Typography has no enforceable UI hierarchy | 74 declarations at 7-9px and eight rendered sizes in the empty workbench | Replace component-local sizes with the six roles in `DESIGN.md`; meaningful text floors at 11px | Entire workbench chrome and conversation metadata | High |
| 2 | Icon language and control geometry are fragmented | Unicode, text approximations, local SVGs, and CSS icons represent peer actions | Adopt one 16px Lucide icon contract and shared 28/32px button primitives | Toolbars, session rows, Composer, menus, timeline actions | High |
| 3 | Lists, buttons, and surfaces do not share a state system | Repeated literal grays, radii, borders, and hover rules remain outside tokens | Introduce semantic surface/state tokens and shared row/button/menu variants before visual tuning | Tokens, session history, inspector lists, popovers, Composer controls | High |

## Improve first

Implement the typography and control-geometry foundation first. Adjusting individual colors or rows before replacing 7-9px text and unstable icon/button dimensions would preserve the root inconsistency and force another cleanup pass.

## Design decision

Adopt the **Quiet Graphite Workbench** direction defined in `DESIGN.md` and rendered in `design-plans/ui-refresh-v1.html`. Preserve the current three-region information architecture and all app-server behavior. Replace the fragmented visual foundation with a six-role type scale, semantic graphite surfaces, one consistent icon family, fixed control geometry, unframed navigation lists, and an integrated assistant timeline. Use lime only for the primary local action or active mode; use blue, amber, red, and green only for semantic states.

## Reuse

- `src/styles/tokens.css` remains the single runtime owner of global color, typography, spacing, radius, control-height, shadow, and motion values.
- `src/features/threads/ThreadHistoryList.tsx` remains the session-row behavior owner, including hover actions, selection, archive, deletion, and copied identifiers.
- `src/features/threads/ConversationTimeline.tsx`, `ConversationTurn.tsx`, `TurnActivityGroup.tsx`, `TurnActivityItem.tsx`, and `TurnFileChanges.tsx` remain the timeline behavior owners.
- `src/features/composer/ComposerAddMenu.tsx`, `ComposerIntentControl.tsx`, and `SendModeControl.tsx` remain the Composer behavior owners.
- `src/shared/useDismissiblePopover.ts` remains the outside-click and Escape behavior owner for non-modal popovers.
- Exemplar: `design-plans/ui-refresh-v1.html` defines target visual composition and breakpoint behavior; it is not production code and must not be imported.

No new product behavior primitive is required. A small shared icon-button implementation is justified only if it replaces multiple existing action-button contracts without moving their business behavior out of current feature owners.

## Changes

1. `src/styles/tokens.css`
   - Change: reconcile current `--ui-*` values with the semantic roles and exact target values in `DESIGN.md`; add missing spacing, type, icon, radius, control, focus, and motion tokens without maintaining two aliases indefinitely.
   - Preserve: dark-first product identity and existing semantic status meanings.
   - Verify: computed styles expose no meaningful text below 11px and no feature-local global palette.

2. `package.json`, lockfile, and the smallest shared UI owner selected during implementation
   - Change: add `lucide-react`; standardize production action icons at 16px, 1.75px stroke, and `currentColor`; consolidate icon, ghost, secondary, primary, and danger button geometry.
   - Preserve: accessible names, current click behavior, 300ms tooltip intent, disabled states, and keyboard focus.
   - Verify: no standard action in the traced workbench uses Unicode, emoji, a text approximation, or a second icon treatment.

3. `src/features/threads/ThreadHistoryList.tsx` and its effective styles
   - Change: implement fixed 40px rows, a stable 56px right action slot, single-line ellipsis before actions, a 2px selected indicator, and shared hover/pressed/focus states.
   - Preserve: thread order, pinning, archive/delete confirmation, copy/fork behavior, and row hit targets.
   - Verify: long Chinese and Latin titles do not overlap actions or change row height at all four target viewports.

4. `src/features/threads/ConversationTimeline.css` and the existing thread presentation components
   - Change: use 15px/24px conversation text, 13px/20px process content, metadata at 11px/16px with at least 6px separation, an unframed assistant activity line, one completed process group, and one end-of-turn file-change summary.
   - Preserve: app-server event order, streaming, scroll anchoring, virtualization, command expansion, current-turn progress, queue behavior, and raw content semantics.
   - Verify: completing a turn only changes process-group presentation and does not reorder or drop events.

5. `src/App.tsx`, `src/App.css`, and `src/features/composer/`
   - Change: normalize Composer and current-thread header against the prototype: one bounded Composer surface, stable 32px send control, mutually exclusive Goal/Plan slot, left utility group, right model group, and compact queued-message rows.
   - Preserve: attachments, slash commands, file mentions, workspace selection, permission/model changes, queue, steer, keyboard shortcuts, and Session continuity.
   - Verify: hover, focus, loading, and mode changes never resize or move the send control.

6. `src/features/runtime/StatusInspector.tsx`, `src/features/runtime/RuntimeLogPanel.css`, `src/features/diff/DiffInspector.css`, and existing overlay styles
   - Change: apply one tab, list-row, menu, and popover surface contract; use one structural border between regions; remove nested decorative frames.
   - Preserve: diagnostics, log limits, Diff navigation, external-click dismissal, Escape handling, and modal destructive confirmation.
   - Verify: inspector defaults closed from 900px through 1179px, and both side regions become independent overlays below 900px.

7. Tests and legacy cleanup
   - Change: add visual/DOM coverage for shared button geometry, history rows, Composer states, menus, and timeline grouping; delete legacy selectors and icon implementations only after their final consumer migrates.
   - Preserve: all behavioral tests and app-server protocol boundaries.
   - Verify: Knip finds no abandoned modules or exports and the production CSS has no unused parallel token family introduced by this refresh.

## Scope

- Inherit: all primary workbench consumers that currently receive global `App.css` and `tokens.css` styles.
- Verify: empty, loading, error, active turn, completed turn, queued input, destructive confirmation, long title, long path, wide Diff, and no-workspace states.
- Exclude: app-server protocol, Runtime process lifecycle, Session persistence, workspace semantics, approval policy, model behavior, queue/steer behavior, light theme, marketing surfaces, and a component-framework migration.

## Validation

- Product: create and resume a Session; switch models and permissions without creating a new Session; queue and steer messages; add files; open a process group; inspect file changes; archive/delete through confirmation.
- Interface: capture `1440x900`, `1280x780`, `1024x720`, and `900x700`; test the longest Session title and model ID; verify focus order, 300ms tooltips, outside click, Escape, selected/hover states, reduced motion, and Chinese/Latin baselines.
- System: confirm global values come from `src/styles/tokens.css`, existing behavior owners remain in their feature modules, and the prototype is never imported by production code.
- Repository: `pnpm test:quality` -> TypeScript, Vitest, production build, Knip, Rust checks, Clippy, and diff checks pass; `pnpm desktop:build` -> desktop debug build succeeds after each coherent implementation stage.

## Stop conditions

- Stop if a visual change requires changing app-server event semantics, Session identity, queue/steer behavior, or approval behavior.
- Stop and split the stage if a non-mechanical diff exceeds roughly 500 changed lines or total review size exceeds 800 lines.
- Stop if a shared primitive would move business behavior out of the current feature owner or create a second runtime token system.
- Stop if the four viewport checks require shrinking meaningful text below 11px or controls below the documented dimensions.

## Design documentation

- `DESIGN.md` is the accepted target contract and must be updated only when an implementation decision intentionally changes the reusable product language.
- `docs/status/ui-shell-status.md` and `docs/status/PROJECT_STATUS.md` should record production progress only after an implementation stage is merged and verified; the existence of this plan or prototype is not evidence that production UI has changed.

## Prototype validation

- `1280x780`: three regions visible; body and main region remain exactly viewport-sized; Composer bottom is 38px above the viewport edge.
- `1024x720`: inspector is hidden; sidebar is 232px; Composer remains fully visible; no body overflow.
- `900x700`: inspector is hidden; sidebar remains visible at the documented threshold; no tested button, row, header, or Composer control overflows its box.
- `design-plans/ui-refresh-v1.html` is a static design artifact only. It intentionally contains no production imports, no app-server calls, and no behavior implementation.
