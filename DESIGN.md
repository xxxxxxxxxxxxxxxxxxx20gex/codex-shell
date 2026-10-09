# Codex Shell Design Standard

> Status: Target contract v1. Production UI may still contain legacy values until the UI refresh is implemented.
> Last updated: 2026-10-08.

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

On Windows WebView2, text rasterization follows the platform default (ClearType/subpixel where available); the application must not force a thinner `antialiased` mode.

### Scale

| Token | Size / line height | Use |
| --- | --- | --- |
| `--text-meta` | `11px / 16px` | timestamps, token counts, secondary metadata only |
| `--text-label` | `12px / 16px` | compact labels, menu descriptions, toolbar text |
| `--text-ui` | `13px / 20px` | buttons, lists, form controls, panels |
| `--text-title` | `14px / 20px` | panel titles, current session title, emphasized list title |
| `--text-conversation` | `14px / 24px` | user and assistant messages |
| `--text-conversation-small` | `13px / 20px` | command output, reasoning summaries, file changes |

Rules:

- Never render meaningful text below `11px`.
- Do not create component-local font sizes when one of the six roles fits.
- Primary labels in menus, lists, dialogs, and preview headers use `--text-ui`; `--text-label` is for descriptions and toolbar text, never the only readable title of a row.
- Command output, file previews, and text attachment previews use the mono family at `--text-conversation-small` with a 20px line height.
- Transitional size aliases may remain while referenced, but each must resolve to the scale role it names (for example, conversation-small resolves to `--text-conversation-small`).
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
- sidebar target width: `248px`, inspector target width: `288px`; project files and previews open at `400px`;
- region header: `48px` high (`--header-height`) for the conversation, inspector home, project files, and side chat so their bottom borders align; secondary bars inside a region (such as the file preview path bar) use `32px`;
- conversation column: one shared `--column-content-width` (`760px`) maximum content width with `--column-gutter` side padding (`32px`, `16px` below `900px`). Timeline turns, code blocks, notices, queue, goal strip, and composer all center on this column and shrink with the viewport; `760px` is a maximum, never a minimum;
- queued messages are a sibling panel immediately above the composer; queue rows must not be nested inside the composer input surface;

Radii:

- row and inline highlight: `4px`;
- button, input, compact control: `6px`;
- menu and dialog: `8px`; composer: `16px` to distinguish the primary writing surface;
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
- Binary switches use a compact 32px by 20px rounded track and a 16px circular thumb; blue (`--accent-info`) denotes enabled, neutral denotes disabled. An unavailable feature must not show an enabled-looking switch; provide its prerequisite action or explain its availability instead.
- In Skill lists and detail dialogs, place the enable switch at the far right of its action group; other buttons precede it. Preserve this horizontal order at narrow widths and in keyboard navigation.

### Focus And Motion

- Keyboard focus uses a 2px `--accent-info` ring with 2px offset.
- Hover feedback: `120ms` (`--motion-fast`); popover entry: `160ms` (`--motion-popover`); no interaction exceeds `200ms`.
- Animate only opacity and transform for transient overlays. Panel width changes (sidebar/inspector open, close, and resize) apply immediately; do not transition grid columns or other layout properties.
- Respect `prefers-reduced-motion`. The active Turn indicator is the only documented exception: its fixed 5px dot may continue a slow opacity-only status pulse because it has no movement, scaling, or layout effect.
- Hover must not move, resize, or reflow controls.

## Lists And Navigation

- Lists are unframed and separated by spacing or subtle dividers, not individual cards.
- History rows use a fixed `56px` height with a stable right-side action slot; the stacked title and timestamp stay readable without allowing row actions to cover text.
- The history action slot is always reserved at `60px` (two 28px `CompactIconButton`s). Its buttons appear on row hover or keyboard focus by opacity only, so the title truncation point never moves. Active rows show Pin and Archive; archived rows show Restore. Secondary actions (copy reference, rename, delete) live in the shared context menu, opened by right-click, the ContextMenu key, or Shift+F10 on the row. Copy feedback temporarily replaces the timestamp line.
- Row action hover uses the neutral `CompactIconButton` treatment; lime is reserved for the selected-row indicator and running status.
- Selected rows use `--surface-selected` plus a 2px action-accent indicator on the left.
- The project file tree keeps the file shown in the preview marked as the current item, including when it was opened from a conversation link; path separator and casing differences must not remove the highlight, and opening a nested file scrolls its row into view.
- Hover actions occupy the stable right action slot and never change row height, push the title, or cover its text.
- Primary label is `--text-ui`; metadata is `--text-meta`; both align to the same 16px icon grid.
- Long labels fade or truncate before actions. Do not place actions on a second row.
- The history viewport keeps scrolling available without rendering a native scrollbar gutter; the action slot keeps its own inner padding.
- Session rows do not use a decorative fade or mask. Their hover/selected surface is continuous, and only the action buttons receive a local background when revealed.
- Empty lists provide one clear next action; loading uses structural placeholders without layout shifts.

### Primary sidebar actions

- The product title belongs to the frameless window title bar and is not repeated inside the sidebar.
- Sidebar primary actions use borderless icon-and-label rows, not framed buttons.
- The sidebar action set is New conversation and Skills; MCP is accessed from the composer. Plugin marketplace management is outside the shell product surface.

## Panels, Menus, And Dialogs

- Sidebar and inspector are full-height structural regions, not floating cards.
- Region headers show the title in `--text-title`/`--text-ui` without decorative English eyebrow labels; identifiers such as the Session ID belong in a tooltip or copy action, not in the header text. Panel toggles, back, maximize, and close in headers use the ghost `CompactIconButton`.
- Use one border between regions; avoid nested panel borders.
- Popovers use `--surface-panel`, `--border-default`, 8px radius, 4px inner padding, and a single restrained shadow.
- Menu rows have a `32px` minimum for a single label and a `40px` minimum when a description is present; two-line rows normally occupy `44px` to preserve 20px/16px line heights and 4px vertical padding, with icon, label, optional description, and shortcut in stable columns. Rows use the 4px row radius, `--text-ui` labels, `--text-label` descriptions, `--text-meta` mono shortcuts, and 16px icons in `--text-muted`. Hover, keyboard focus, and the current choice use `--surface-selected` with `--text-primary`; menus do not tint rows or icons with lime. Group separators are spacing or one subtle divider, not a border under every row.
- This geometry applies to the composer add, permission, send-mode, slash-command, and model menus, the history menu, and the shared context menu. Selectors with different semantics (radio choice, checkbox, listbox) keep their own roles; they share geometry, not behavior.
- Elements with `role="menu"` move focus to the current choice or first enabled item on open, support Up/Down (wrapping), Home, End, and Escape, close on Tab or outside click, and return focus to the trigger after Escape or selection.
- Full-screen modal scrims use `--scrim` and `--scrim-blur`; feature CSS does not introduce its own backdrop color or blur.
- Dialogs use a clear title, short explanation only when necessary, and right-aligned actions.
- Settings use a 1040px by 760px preferred surface constrained to the viewport, with a fixed navigation column and one scrolling content region. The header offers only close, with no maximize, minimize, or restore mode. Channel editing replaces the list in the content region instead of appending a nested form below it.
- Clicking outside closes non-modal popovers; destructive confirmation remains modal.
- Context menus are contextual: suppress browser page menus on blank space, buttons, and unselected content; offer exactly Select all, Copy, and Paste in enabled text inputs, textareas, and contenteditable regions. Disable Copy without a selection or in password fields, and Paste in readonly fields; preserve keyboard shortcuts and native undo for text insertion. Selected body text offers a copy-only menu. Project-file and thread-history custom menus take precedence. This policy covers application DOM and portals, not embedded document viewers in separate frames.
- Local file links, resource thumbnails, and file-change entries offer Copy absolute path. Resolve relative paths against the current conversation project and exclude line references; external URLs and images without a local file path do not offer this action.

## Window Chrome

- Launch maximized within the Windows work area, keeping the taskbar and title-bar controls available. Restore centers the window at 85% of the current monitor's work-area width and height. Apply a 900x640 logical-pixel minimum after DPI conversion, capped by the available work area on small screens. Window placement is not persisted between launches.
- When a normal window changes monitor, DPI, or work area, refresh its minimum size and constrain only geometry that no longer fits. Preserve manual size and position where possible; do not reset to 85% or recenter on ordinary moves. Maximized/minimized windows defer these adjustments until restored.
- Windows uses a 32px product-owned frameless title bar instead of native decorations.
- The whole non-interactive title-bar area remains draggable; double-click toggles maximize and restore.
- Minimize, maximize/restore, and close stay in a fixed right-side control group. Maximize/restore uses the Rust window-layout command so monitor geometry stays in the system layer; minimize and close call Tauri window APIs directly.
- Window buttons are borderless and rectangular. Only the close button uses danger color, and only on hover.
- The custom title bar does not promise the Windows 11 native Snap Layout hover menu; resizing and explicit maximize/restore remain available.

## Conversation Timeline

- Markdown tables provide a top-right 28px ghost copy button with a 16px Lucide icon, outside the horizontally scrolling table. Copy exports visible cell text as tab-separated rows, including headers; success and failure use a compact status label. The action remains keyboard accessible and never overlays cell content.

- User messages are compact right-aligned bubbles sized to content, with a sensible maximum width.
- User-message copy/edit actions are a compact inline exception: 24px hit targets (`--control-height-inline`), 14px icons (`--icon-size-inline`) with 1.75px stroke, borderless neutral hover and the standard keyboard focus ring. Other message and toolbar controls retain their existing sizes.
- User bubbles use the borderless raised surface, 8px vertical and 16px horizontal padding, and the shared 8px panel radius. Metadata follows after 8px, with time and compact inline icon controls on one right-aligned row; the full date and time remain available on hover. User text preserves line breaks and wraps long unbroken strings.
- Assistant responses are unframed and use one subtle 2px action marker at the first answer line; completed responses do not carry a full-height rail.
- Reasoning, commands, MCP calls, and file work collapse into one process group after completion.
- Process summaries are low-contrast, unframed rows. Their verbs come only from structured Core events: tool calls are described as calls rather than loads, and command text may be shown inline when exactly one command is represented.
- Command output and diffs use the mono family and conversation-small size.
- Timestamps and duration sit at least 6px away from message content.
- File changes appear once at the end of the turn, grouped by file with semantic status color.
- Streaming indicators must not resize the message column or steal focus.
- Fenced Markdown code fills the reply column with one continuous raised surface, a subtle border and dedicated 20px `--radius-code-block`. The header uses a 16px code icon, 13px language label, and 28px wrap/copy controls. Header and body share 16px horizontal padding without a divider. Code uses regular-weight 13px/20px monospace; long lines scroll internally by default, with a per-block wrap toggle that never changes copied text. Inline code remains inline.

## Composer

- Composer is the dominant bounded tool surface and uses the dedicated 16px composer radius, with a quiet neutral background and a 32px action toolbar. It shares the conversation column width so its edges align with timeline turn frames; assistant content retains its 16px marker indent. The main timeline measures column width outside the scrollbar gutter.
- Notices and queue panels stack above the composer with an `8px` gap. The goal strip joins the composer directly as described below.
- The text area has no inner card border; toolbar and input share one surface.
- Composer height is adjusted from a compact handle at the upper right, with space reserved so it never covers text. Dragging upward expands the input upward while the bottom toolbar stays anchored; dragging downward shrinks it. Preserve the 64–320px input range, support Up/Down keys, and let Escape cancel an active drag. Disable the native bottom-right textarea resizer.
- An active goal uses a single compact status strip immediately above the composer. Its icon and readable objective lead; status and elapsed time are secondary metadata; a separate right-side icon button owns the clear action. Long objectives truncate with their full text available on hover. The strip and composer meet without a double border.
- Nearby runtime, error, success, and queue notices use `--text-label` for actionable text; reserve `--text-meta` for counts, elapsed time, and secondary state. Notices keep their main message readable and truncate only when space is constrained.
- Repeated icon-only actions around the composer share the 28px compact-button geometry, 16px Lucide icon, focus ring, and descriptive hover title. Status text itself does not trigger destructive or dismiss actions.
- Left group: add, permission, mode, activity. Right group: model, effort, send.
- Goal and Plan share one mutually exclusive mode slot.
- The send button is a stable 32px square and changes function without moving.
- Queued messages appear in one sibling panel immediately above the input, sharing the composer's left and right edges. Use continuous 40px rows, 13px single-line previews, optional 32px image thumbnails, and stable right-aligned actions. The labeled Steer action precedes 28px delete and more buttons; edit lives in the shared menu. Running queues omit repeated waiting labels and headings; idle queues retain the resume action. Long queues scroll within a four-row viewport, and menus render outside that scroll region.

## Sketch Workspace

- Image sketching uses a quiet, immersive canvas with the editor title and file name in a compact header; the canvas remains the dominant surface.
- The drawing toolbar is a small floating capsule centered near the top of the canvas. It uses shared 28px icon buttons, one visible action label for adding an image, and a restrained local selected state for the active tool.
- Brush size is controlled by a vertical slider on the left edge of the canvas. Color choices sit in a compact bottom palette with circular swatches and one custom-color control. These controls stay over the canvas so they do not create a second panel or reduce the working area with a full-width toolbar.
- Close remains in the upper-left header action slot; cancel and the single primary save action remain right-aligned in the footer. The save action is the only filled action in that local group.
- The canvas uses the existing canvas surface as a uniform black working field; popover background, focus ring, and shadow continue to use semantic tokens. Feature CSS must not introduce a new global color, radius, or control scale for drawing tools.
- Tooltips and accessible names are required for icon-only tools, swatches, the size slider, and custom color input. Focus must remain visible, and the layout must fit at 1440x900, 1280x780, 1024x720, and 900x700 without horizontal overflow. Reduced motion keeps the controls static.

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
