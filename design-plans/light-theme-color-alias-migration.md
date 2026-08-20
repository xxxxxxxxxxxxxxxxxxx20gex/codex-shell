# Restore semantic colors in light and system themes

Written against: b4040d48acd76302938c55cbf93e5f26def5b281

## Evidence chain

- Surface: `src/App.tsx` Composer model picker and connected desktop shell controls under `data-theme="light"` or light-resolved `data-theme="system"`.
- Problem: the selected model and reasoning effort combine the light-theme `--text-primary` with the dark-theme value inherited through `--ui-surface-selected`; the observed pair `#1c211d` on `#292d2e` is approximately 1.17:1 contrast instead of the intended light pair `#1c211d` on `#dce4d8`, approximately 12.56:1.
- Design evidence: `DESIGN.md` makes `src/styles/tokens.css` normative, requires semantic color roles in light mode, forbids feature CSS from branching on theme names, and requires WCAG AA contrast. `src/styles/tokens.css:57-77` declares transitional color aliases on `:root`; `src/styles/tokens.css:94-140` overrides canonical colors for light and system-light without redefining most aliases.
- Owner: canonical theme colors belong to `src/styles/tokens.css`; consumers are `src/App.css`, `src/features/attachments/AttachmentGallery.css`, `src/features/diff/DiffInspector.css`, `src/features/runtime/RuntimeLogPanel.css`, and `src/features/threads/ConversationTimeline.css`.
- Scope and affected surfaces: model picker selection, history selection, Composer add-menu hover, send-mode hover, workspace-clear hover, attachment-preview hover and dividers, Diff dividers, runtime error severity, queue/activity accents, and user-message navigation accents.
- Uncertainty: none. The canonical replacement Token exists for every affected color alias in scope.

## Design decision

Replace remaining color-only transitional and short aliases at their consumers with the canonical semantic Tokens already defined by the design system. Do not duplicate light-theme values into component selectors or add theme-specific feature branches. Remove a color alias declaration only after its color consumers reach zero; leave unrelated geometry, typography, shadow, and motion aliases outside this change.

## Reuse

- `--surface-canvas`, `--surface-sidebar`, `--surface-panel`, `--surface-raised`, `--surface-selected`
- `--border-subtle`, `--border-default`
- `--text-primary`, `--text-secondary`, `--text-muted`, `--text-disabled`
- `--accent-action`, `--accent-danger`
- Exemplar: `src/features/preferences/PreferencesPanel.css`, whose selected and hover states already consume `--surface-selected`, `--surface-raised`, and canonical text Tokens without theme branches.

## Changes

1. `src/App.css`
   - Change: replace color uses of `--ui-surface-active`, `--ui-surface-selected`, `--ui-surface-hover`, `--ui-line`, `--ui-text-disabled`, `--ui-text-control`, `--ui-accent`, `--ui-danger`, and the short `--line`, `--accent`, and `--red` aliases with their canonical semantic Tokens. Remove now-unused color-only short aliases from the top-level compatibility block.
   - Preserve: layout dimensions, control geometry, dark theme appearance, `--ui-accent-ink` behavior for text rendered on the action-filled button, and non-color transitional aliases.
   - Verify: model and reasoning selected states use the light `--surface-selected`; model labels, history rows, menus, and hover controls remain readable in dark, light, and system themes.
2. `src/features/attachments/AttachmentGallery.css`
   - Change: replace `--ui-line` with `--border-subtle` and `--ui-surface-hover` with `--surface-raised`.
   - Preserve: the deliberately dark image-preview scrim and image caption gradient.
   - Verify: attachment preview header divider and close hover match the active theme.
3. `src/features/diff/DiffInspector.css`
   - Change: replace inherited short `--line` uses with `--border-subtle`.
   - Preserve: semantic added/deleted/renamed colors and the current Diff layout.
   - Verify: light-theme Diff separators are subtle rather than dark graphite.
4. `src/features/runtime/RuntimeLogPanel.css`
   - Change: replace inherited short `--red` with `--accent-danger`.
   - Preserve: warning/debug/trace severity presentation.
   - Verify: error rails resolve to the light-theme danger color.
5. `src/features/threads/ConversationTimeline.css`
   - Change: replace inherited short `--accent` with `--accent-action`; coordinate with the separate glow-removal plan if both are implemented together.
   - Preserve: active-navigation geometry and interaction behavior.
   - Verify: active message markers use the current theme's action accent.
6. `src/styles/tokens.css`
   - Change: after repository-wide verification that each migrated color alias has no consumer, delete only the unused color aliases. Keep non-color migration aliases and the explicitly light-overridden `--ui-accent-ink` until a canonical text-on-action Token is separately approved.
   - Preserve: canonical dark/light/system palettes and theme preview Tokens.
   - Verify: no feature stylesheet introduces `[data-theme]` branches and no deleted alias remains referenced.
7. `docs/status/ui-shell-status.md`, `docs/status/testing-release-status.md`, and `docs/status/PROJECT_STATUS.md`
   - Change: replace stale theme-quality statements with the completed alias migration, affected surfaces, and actual validation evidence.
   - Preserve: historical details owned by Git rather than appending a troubleshooting log.
   - Verify: documentation describes the current implementation and only records commands that passed.

## Scope

- Inherit: all current and future light/system-light consumers that use the migrated canonical Tokens.
- Verify: model picker, history, Composer menus, permission selector, workspace selector, attachments, Diff, runtime logs, conversation timeline, preferences, and right inspector at 1440x900, 1280x780, 1024x720, and 900x700.
- Exclude: modal/image-preview scrims, context heat-bar mask and gradient, product mark colors, theme preview swatches, layout/typography changes, and new color palette design.

## Validation

- Product: switch among dark, light, and system appearance; open the model picker, select each model and effort, then inspect connected hover/selected states. Selected model text must remain readable and the intended item must remain visually selected.
- Interface: verify model picker, history rows, Composer add/send menus, workspace selector, attachment preview, Diff, runtime diagnostics, and message navigation at 1440x900, 1280x780, 1024x720, and 900x700; test hover, focus, selected, disabled, and open/closed states.
- System: computed styles in light mode must resolve selected backgrounds to `--surface-selected` (`#dce4d8` on the current palette), action accents to `--accent-action` (`#628b19`), and dividers to canonical light border values. Dark mode computed colors must remain unchanged.
- Repository: `rg -n "var\(--(ui-(surface-active|surface-selected|surface-hover|line|text-disabled|text-control|accent|danger)|line|accent|red)\)" src -g "*.css"` -> no color consumer remains except an explicitly preserved and documented case; `pnpm test:quality` -> exit code 0; `pnpm desktop:build` -> debug desktop executable rebuilt successfully.

## Stop conditions

- Stop if a candidate alias is still required by a non-color contract, if its canonical replacement is ambiguous, or if computed light-theme values do not reproduce the supplied screenshot defect before implementation.

## Design documentation

- After acceptance and validation: update `DESIGN.md` Source Of Truth or Acceptance Checklist to state that transitional aliases may cover only non-color migration roles; theme-sensitive color consumers must use canonical semantic Tokens directly.
