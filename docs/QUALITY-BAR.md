# Quality bar (every agent, every screen)

Four sources, in this order of authority:

1. **Hallmark Floor** (github.com/nutlope/hallmark). A local copy of the skill is at `.tools/hallmark/`. Read `SKILL.md` § The Floor, plus `references/gates.md` § 1–2, `interaction-and-states.md`, `microinteractions.md`, `data-viz.md` (charts) and `dark-mode.md`. Floor items that bind this app:
   - Colours and fonts only through tokens (globals.css). Never `transition: all`; never animate width/height/top/left.
   - Every interactive element gets an instant `:focus-visible`. Every animation gets a `prefers-reduced-motion` fallback.
   - **No eyebrows. No tracked-capital or small-caps labels.** Labels, table heads, tags and nav use the body face, a step smaller, sentence case, untracked. (This replaces the old uppercase micro-labels: convert them wherever you touch a file.)
   - **No middle-dot-joined meta strings** ("Monthly · due Nov 20" becomes two pieces of information laid out properly, e.g. a second line or separate columns). No arrows glued to link text. No decorative status dots.
   - No card inside a card, no emoji icons, no purple-to-blue gradients.
   - Never invent a metric, testimonial, logo or customer count.
   - `overflow-x: clip` on html/body; grid tracks `minmax(0,1fr)`.
   - Static check: `node .tools/hallmark/scripts/sloplint.mjs <your files> --scope app` (use `--scope page` for the landing page). Fix every FAIL. Fix or justify every REFLEX in your report.
2. **impeccable** skill: load it with the Skill tool for design and polish judgement (hierarchy, spacing, states, UX copy). Don't start its live or interactive modes.
3. **Copy**: follow no-ai-slop (github.com/petergyang/no-ai-slop; local copy `.tools/no-ai-slop/SKILL.md`). Plain, specific, active words. None of: seamless, effortless, elevate, unlock, empower, streamline, robust, leverage, supercharge. No "not X, it's Y" lines, no colon reveals, no em-dash rhythm, no fake-profound kickers.
4. **Mobbin**: search it (ToolSearch "+mobbin") for every screen or flow you build or change. Cite the app, screen and URL exactly as returned.

Plus `docs/MOTION-SPEC.md` (Apple/Stripe motion and polish) and `docs/BUILD-NOTES.md` (stack and conventions).

## 5. Use the UI library (shadcn/ui on Base UI) properly
shadcn/ui is the component library. Its components live in `src/components/ui/`. Compose them; don't hand-roll equivalents. Style through their props, variants and `className`. Agent D's tokens are already inside them. Mapping:

| need | use | not |
|---|---|---|
| any card / panel / section box | `Card` (+ `CardHeader`/`CardTitle`/`CardContent`/`CardFooter`) | a div with `bg-card rounded border` |
| list row (title, meta, trailing amount, tap target) | `Item` (+ `ItemMedia`/`ItemContent`/`ItemTitle`/`ItemDescription`/`ItemActions`), `render={<button/>}` or `render={<Link/>}` when tappable | raw `<button>` or `<li>` styled by hand |
| empty state | `Empty` (+ `EmptyHeader`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription`/`EmptyContent`) | a dashed div |
| form field | `Field` (+ `FieldLabel`/`FieldDescription`/`FieldError`/`FieldGroup`) with `Input`, `Textarea`, `InputGroup` | `Label` placed beside a control with no `htmlFor` |
| choose one of many | `Select` for long or labelled lists; `NativeSelect` when the native mobile picker is better (currency, interval, dates-of-month) | raw `<select>` |
| 2–4 exclusive options (segmented) | `ToggleGroup` (spacing 0, sliding thumb) or `Tabs` | `role="radiogroup"` buttons |
| checkbox | `Checkbox` with a `FieldLabel` | `<input type="checkbox">` |
| status / tag (Active, Paused, Trial ends…) | `Badge` (variants) | a styled `<span>` |
| person / client initials | `Avatar` + `AvatarFallback` | a styled div |
| icon-only button | `Button size="icon*"` with `aria-label`, wrapped in `Tooltip` on desktop | a bare `<button>` |
| keyboard hints | `Kbd` / `KbdGroup` | `<span class="font-mono">⌘K</span>` |
| pending | `Spinner` inside the `Button` | text-only "Saving…" |
| horizontal chip rows | `ScrollArea` (horizontal) | `overflow-x-auto` divs |
| dividers | `Separator` | `border-t` divs |
| mobile bottom sheet | `Drawer`; desktop side panel: `Sheet` (`side="right"`) when it fits better | custom fixed panels |
| confirm destructive | `AlertDialog` | `window.confirm` |
| menus | `DropdownMenu` | custom popovers |
| date picking | native `<input type="date">` inside `Input` styling is fine on mobile. Use `Calendar` + `Popover` only where a range picker helps (transactions date range) | — |

Raw HTML elements are fine only where no component exists. Examples: the swipe-row gesture surface, landing-page marketing markup, or a big amount input styled as a display number. In those cases keep the focus ring and states consistent.
