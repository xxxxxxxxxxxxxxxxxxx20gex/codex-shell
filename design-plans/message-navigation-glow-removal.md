# Remove the decorative message-navigation glow

Written against: b4040d48acd76302938c55cbf93e5f26def5b281

## Evidence chain

- Surface: user-message navigation markers rendered by `src/features/threads/ConversationTimeline.tsx` and styled by `src/features/threads/ConversationTimeline.css`.
- Problem: the active marker adds a fixed lime `rgba(194,232,92,.52)` glow that does not follow the active theme and becomes especially bright on light surfaces.
- Design evidence: `DESIGN.md` requires accent colors to communicate state rather than decorate, explicitly says to avoid glow decoration, and requires feature CSS to consume semantic Tokens instead of introducing literal colors.
- Owner: `src/features/threads/ConversationTimeline.css:11-15`.
- Scope and affected surfaces: active user-message navigation marker only.
- Uncertainty: none. The existing solid marker already communicates active state without the shadow.

## Design decision

Remove the active marker's fixed-color `box-shadow` and retain one solid `--accent-action` marker. This keeps the active state visible while eliminating theme-independent decoration and requires no new Token or component.

## Reuse

- `--accent-action`
- Exemplar: `src/App.css` active Session indicator uses a solid 2px `--accent-action` inset marker without glow.

## Changes

1. `src/features/threads/ConversationTimeline.css`
   - Change: remove the `box-shadow` from `.user-message-navigation button.active span` and use `--accent-action` for its background, unless the color-alias migration has already made that replacement.
   - Preserve: 13px active width, inactive/hover widths, keyboard focus ring, click targets, navigation behavior, and reduced-motion behavior.
   - Verify: the active marker remains unambiguous in dark, light, and system themes without a halo.
2. `docs/status/timeline-status.md`, `docs/status/ui-shell-status.md`, and `docs/status/testing-release-status.md`
   - Change: record the removal of the fixed-color glow and the actual visual/regression evidence.
   - Preserve: current timeline behavior descriptions and current-only documentation style.
   - Verify: documentation does not claim a new interaction or functional change.

## Scope

- Inherit: every user message group that renders navigation markers.
- Verify: single-message groups, multi-message groups, active/inactive markers, hover, keyboard focus, dark/light/system themes, and virtualized long conversations.
- Exclude: assistant activity line, Turn processing pulse, context heat bar, Session running indicator, and all navigation behavior.

## Validation

- Product: open a conversation with multiple user-message navigation markers and switch the active marker; the active position remains clear without a glow.
- Interface: inspect dark, light, and system themes at 1440x900, 1280x780, 1024x720, and 900x700; verify default, hover, focus, and active states.
- System: no literal lime `rgba` remains in the active marker rule, and the computed background resolves through `--accent-action`.
- Repository: `rg -n "194,232,92|user-message-navigation.*box-shadow" src -g "*.css"` -> no fixed glow remains; `pnpm test:quality` -> exit code 0; `pnpm desktop:build` -> debug desktop executable rebuilt successfully.

## Stop conditions

- Stop if the marker is not rendered for the audited state or if removing the shadow makes active and inactive markers indistinguishable at any required theme and viewport; do not invent a replacement glow.

## Design documentation

- After acceptance and validation: none; `DESIGN.md` already forbids decorative glow and defines semantic action accents.
