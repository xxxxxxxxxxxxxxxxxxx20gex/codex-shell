# Codex Shell Design Standard

> Status: Target contract v1. Production UI may still contain legacy values until the UI refresh is implemented.
> Last updated: 2026-08-19.

## Product Character

Codex Shell is a personal Windows AI development workstation. The interface must feel quiet, precise, and operational: optimized for long sessions, scanning, comparison, and repeated action. It is not a marketing surface, a dashboard of decorative cards, or a showcase for visual effects.

The design direction is **Quiet Graphite Workbench**:

- neutral graphite surfaces rather than blue-black or brown monochrome;
- high legibility with restrained contrast between structural layers;
- one lime action accent, with blue, amber, and red reserved for semantic states;
- compact controls with stable geometry and predictable alignment;
- assistant output integrated into the timeline instead of boxed into repeated cards.
- assistant responses use one 2px action marker at the first answer line; completed responses do not carry a full-height gray rail, and continuation blocks do not repeat the marker.
- elapsed durations use compact `s`/`m s` units, and transient reconnect notices stay inside the active process status instead of occupying the Composer error slot.

## Source Of Truth

- This file is the normative design contract for new or modified UI.
- `src/styles/tokens.css` is the runtime token implementation and must converge on this contract.
- Feature CSS may consume tokens but must not redefine the global type, color, spacing, radius, control-height, shadow, or motion scales.
- A design exception must be documented here before it becomes a new reusable pattern.
- Screenshots and mockups are evidence for a change, not a second design system.
- Before changing a button or control, inspect the accepted design mockup and the owning tokens; preserve the shared control geometry and use explicit size/visual hierarchy (primary, secondary, ghost, danger) instead of inventing per-screen dimensions.

## Typography

### Families

| Role | Family |
| --- | --- |
| UI and conversation | `"Segoe UI Variable Text", "Segoe UI", Inter, "Microsoft YaHei UI", sans-serif` |
| Code and data | `"Cascadia Code", "SFMono-Regular", Consolas, monospace` |

Use weights `400`, `500`, and `600` only. Letter spacing is always `0`.

### Scale

| Token | Size / line height | Use |
| --- | --- | --- |
| `--text-meta` | `11px / 16px` | timestamps, token counts, secondary metadata only |
| `--text-label` | `12px / 16px` | compact labels, menu descriptions, toolbar text |
| `--text-ui` | `13px / 20px` | buttons, lists, form controls, panels |
| `--text-title` | `14px / 20px` | panel titles, current session title, emphasized list title |
| `--text-conversation` | `15px / 24px` | user and assistant messages |
| `--text-conversation-small` | `13px / 20px` | command output, reasoning summaries, file changes |

Rules:

- Never render meaningful text below `11px`.
- Do not create component-local font sizes when one of the six roles fits.
- Use tabular numbers for durations, timestamps, token counts, line numbers, and progress values.
- Truncate dense single-line labels; wrap conversation content naturally.
- Keep Chinese and Latin text on the same visual baseline; do not compensate with arbitrary vertical offsets.

## Color

### Neutral surfaces

| Token | Value | Role |
| --- | --- | --- |
| `--surface-canvas` | `#101112` | application canvas |
| `--surface-sidebar` | `#141617` | navigation and inspector base |
| `--surface-panel` | `#191B1C` | composer, menus, bounded tools |
| `--surface-raised` | `#202324` | hover rows, elevated controls |
| `--surface-selected` | `#292D2E` | selected rows and pressed controls |
| `--border-subtle` | `#272A2B` | structural separators |
| `--border-default` | `#35393A` | controls and popovers |
| `--border-strong` | `#484D4E` | focused or emphasized boundaries |

### Text and semantics

| Token | Value | Role |
| --- | --- | --- |
| `--text-primary` | `#F1F3F1` | primary content |
| `--text-conversation-primary` | `#F6F7F5` | long-form assistant output with slightly higher reading contrast |
| `--text-secondary` | `#C5CAC6` | labels and supporting content |
| `--text-muted` | `#909691` | metadata and inactive content |
| `--text-disabled` | `#606561` | disabled content |
| `--accent-action` | `#B8D957` | primary action and active mode |
| `--accent-info` | `#73B7E8` | links, information, file references |
| `--accent-warning` | `#DDB45E` | warnings and approval attention |
| `--accent-danger` | `#E17972` | destructive actions and errors |
| `--accent-success` | `#74BF83` | completed state |

Context usage uses a dedicated continuous scale because it encodes a quantitative value rather than an action state:

| Token | Value | Role |
| --- | --- | --- |
| `--context-cool` | `#4593FF` | low context usage |
| `--context-balanced` | `#48CBD2` | moderate context usage |
| `--context-warm` | `#E2AA45` | elevated context usage |
| `--context-hot` | `#ED5B4F` | near-limit context usage |
| `--context-marker` | `#F1F3F1` | current usage marker |

Rules:

- Accent colors communicate action or state; they are not decoration.
- The lime accent appears once per local action group, not on every icon.
- Text contrast must meet WCAG AA against its actual surface.
- Avoid pure white, pure black, gradients, glow decoration, and large tinted backgrounds.
- Destructive controls stay neutral until hover or confirmation, then use danger semantics.

### Appearance modes

- The application offers dark, light, and Windows-system appearance preferences.
- Dark remains the default and follows the Quiet Graphite Workbench palette above.
- Light mode uses the same semantic surface, border, text, and accent roles; feature CSS must never branch on a theme name.
- System mode resolves through `prefers-color-scheme` and must remain live when Windows changes its appearance.
- Theme preview colors are tokens owned by `src/styles/tokens.css`; feature styles do not introduce literal colors.

## Spacing And Geometry

Use a 4px base rhythm:

| Token | Value |
| --- | --- |
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |

Stable dimensions:

- icon-only button: `28px` square;
- compact control: `28px` high;
- regular control and list row: `32px` high;
- history row: `56px` high when the title and timestamp are stacked;
- composer toolbar: `32px` high;
- icon: `16px`, stroke `1.75px`;
- sidebar target width: `248px`, inspector target width: `288px`;
- conversation readable width: `760px` to `820px`;
- composer maximum width: `860px`.
- queued messages are a sibling panel immediately above the composer; queue rows must not be nested inside the composer input surface;

Radii:

- row and inline highlight: `4px`;
- button, input, compact control: `6px`;
- menu, dialog, composer: `8px`;
- do not use pills unless the value is a short status or removable selection.

## Icons

- Production UI uses `lucide-react` icons when implementation begins.
- Icons are `16px` with `1.75px` stroke and inherit `currentColor`.
- Do not mix Unicode symbols, emoji, text approximations, and custom SVGs for standard actions.
- Icon-only buttons require an accessible name and a tooltip after approximately `300ms` hover.
- Use one icon for one concept across the app: add, close, send, archive, delete, copy, fork, plan, goal, settings, collapse, and expand must not have local variants.
- Chevron orientation communicates expansion state; do not use chevrons as decorative separators.

### Product mark

- The Codex Shell application mark is the negative-core `CS` monogram defined in `assets/branding/cs-app-icon.svg`.
- The white outer `C`, lime inner `S`, and lime terminal dot sit on the graphite raised surface; the mark uses the same neutral and action colors as the product UI.
- Platform icons are generated from the SVG master through the Tauri icon generator. Do not hand-edit individual PNG, ICO, or ICNS derivatives.
- Keep the transparent outer margin and rounded-square silhouette intact so the mark remains legible in Windows taskbar, shortcut, and installer sizes.

## Controls

### Buttons

- `primary`: filled action accent, one per action group.
- `secondary`: neutral surface with subtle border.
- `ghost`: transparent until hover; default for toolbar and row actions.
- `danger`: neutral by default, danger color on hover and in confirmation.
- All variants share the same typography, icon geometry, focus ring, and disabled behavior.
- Text buttons use sentence-case action labels. Icon buttons use familiar symbols without redundant visible text.

### Focus And Motion

- Keyboard focus uses a 2px `--accent-info` ring with 2px offset.
- Hover feedback: `120ms`; popover entry: `160ms`; no interaction exceeds `200ms`.
- Animate only opacity and transform for transient overlays.
- Respect `prefers-reduced-motion`. The active Turn indicator is the only documented exception: its fixed 5px dot may continue a slow opacity-only status pulse because it has no movement, scaling, or layout effect.
- Hover must not move, resize, or reflow controls.

## Lists And Navigation

- Lists are unframed and separated by spacing or subtle dividers, not individual cards.
- History rows use a fixed `56px` height with a stable right-side action slot; the stacked title and timestamp stay readable without allowing row actions to cover text.
- Selected rows use `--surface-selected` plus a 2px action-accent indicator on the left.
- Hover actions occupy the stable right action slot and never change row height, push the title, or cover its text.
- Primary label is `--text-ui`; metadata is `--text-meta`; both align to the same 16px icon grid.
- Long labels fade or truncate before actions. Do not place actions on a second row.
- The history viewport keeps scrolling available without rendering a native scrollbar gutter; the action slot keeps its own inner padding.
- Session rows do not use a decorative fade or mask. Their hover/selected surface is continuous, and only the action buttons receive a local background when revealed.
- Empty lists provide one clear next action; loading uses structural placeholders without layout shifts.

### Primary sidebar actions

- The product title belongs to the frameless window title bar and is not repeated inside the sidebar.
- Sidebar primary actions use borderless icon-and-label rows, not framed buttons.
- The initial action set is intentionally limited to New conversation and Plugins; Plugins may remain disabled while its implementation is not available.

## Panels, Menus, And Dialogs

- Sidebar and inspector are full-height structural regions, not floating cards.
- Use one border between regions; avoid nested panel borders.
- Popovers use `--surface-panel`, `--border-default`, 8px radius, and a single restrained shadow.
- Menu rows are at least `32px` high, with icon, label, optional description, and shortcut in stable columns.
- Dialogs use a clear title, short explanation only when necessary, and right-aligned actions.
- Clicking outside closes non-modal popovers; destructive confirmation remains modal.

## Window Chrome

- Windows uses a 32px product-owned frameless title bar instead of native decorations.
- The whole non-interactive title-bar area remains draggable; double-click toggles maximize and restore.
- Minimize, maximize/restore, and close stay in a fixed right-side control group and call Tauri window APIs directly.
- Window buttons are borderless and rectangular. Only the close button uses danger color, and only on hover.
- The custom title bar does not promise the Windows 11 native Snap Layout hover menu; resizing and explicit maximize/restore remain available.

## Conversation Timeline

- User messages are compact right-aligned bubbles sized to content, with a sensible maximum width.
- Assistant responses are unframed and use one subtle 2px action marker at the first answer line; completed responses do not carry a full-height rail.
- Reasoning, commands, MCP calls, and file work collapse into one process group after completion.
- Command output and diffs use the mono family and conversation-small size.
- Timestamps and duration sit at least 6px away from message content.
- File changes appear once at the end of the turn, grouped by file with semantic status color.
- Streaming indicators must not resize the message column or steal focus.
- Fenced Markdown code renders as one bounded structure with a language header (`纯文本` when unspecified), a copy action, and a monospaced scrollable body; inline code remains inline.

## Composer

- Composer is the dominant bounded tool surface and may use the 8px radius.
- The text area has no inner card border; toolbar and input share one surface.
- Left group: add, permission, mode, activity. Right group: model, effort, send.
- Goal and Plan share one mutually exclusive mode slot.
- The send button is a stable 32px square and changes function without moving.
- Queued messages appear above the input as compact rows, not cards nested inside the composer.

## Responsive Behavior

- At `>= 1180px`, show all three regions.
- From `900px` to `1179px`, inspector defaults closed and opens as an overlay.
- Below `900px`, sidebar and inspector are independent overlays; the conversation and composer remain primary.
- Resizers remain keyboard reachable and do not overlap row text.
- Panel visibility controls stay hidden during normal use and reveal only when the divider is hovered, focused, or actively resized; collapsed-panel controls remain visible so the panel can be restored.
- Full-screen modal backdrops sit above resizers and window chrome, so background panel controls cannot show through or receive pointer input.
- No text or control may shrink below the defined minimum sizes to preserve a three-column layout.

## Acceptance Checklist

- No meaningful text below `11px`.
- No component-local hardcoded color when a semantic token exists.
- Transitional aliases may cover only non-color migration roles; theme-sensitive colors consume canonical semantic Tokens directly.
- No standard action represented by Unicode or emoji.
- No nested cards or double borders.
- Button, icon, and row geometry is stable across hover, loading, and selection.
- Light/dark contrast is not inferred from screenshots; verify computed colors.
- Verify desktop at `1280x780` and `1440x900`, compact at `1024x720`, and narrow at `900x700`.
- Verify keyboard focus, tooltip naming, outside-click dismissal, reduced motion, truncation, and Chinese/Latin alignment.
