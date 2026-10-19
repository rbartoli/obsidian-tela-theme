# Changelog

## 1.1.1 (2026-10-19)

Fixes only, cut from 1.1.0. The new options to dim images and tint italics, on main since 2026-10-17, wait for the next minor release.

- Checked: `npm run qa` on the release, Obsidian 1.14.4: 0 violations in 378 screens.

### 2026-10-18: inputs on macOS keep Tela's 6px corners

- Obsidian rounds inputs to 8px on macOS (`--input-radius` on `.mod-macos`, which outranks the theme's `body`), so text fields, dropdowns and buttons there weren't Tela's 6px. They are now; phones and tablets keep Obsidian's touch radius.
- Checked: `--input-radius` computes 6px with `.mod-macos` on body and stays at Obsidian's touch radius with `.is-mobile`. `npm run qa` doesn't run on macOS, so it can't see this change.

### 2026-10-17: no `:has()` selectors

Obsidian's theme review warns against `:has()`, which can make the browser restyle much of the page on any change. It flagged 1.1.0's two, and the fold rule below would have added five. Each now hooks something Obsidian marks itself.

- Rows picked for a batch action add a 1px accent ring, the one a hovered input takes, to Obsidian's accent selection. The open note keeps its accent wash during a pick, where 1.1.0 stepped it back to the hover wash: only `:has()` could tell that a pick was under way, and the ring alone sets picked rows apart.
- In live preview the quote bar runs the full height of its lines, with square ends: only `:has()` could find a quote's last line to round it. Reading view keeps the rounded bar, 2px clear of the ends.
- In live preview, the space after a folded section hangs below the "…" of a folded H3 to H6. A heading after a folded H3 still gets the 40px an open section leaves, but so does an H3 after a folded H3, where folded headings of one level stayed 16px apart; and a folded H1 or H2 gets no extra space, since below their rule it would push the rule away from the text. Reading view is unchanged.
- Checked on Obsidian 1.14.4: `theme.css` has no `:has(` selector and `npm run lint` passes. In live preview an H2 after a folded H3 sits 41px below it, against 40px after an open section; the quote bar measures no inset and no radius; picked rows measure the ring in both modes, and the open note keeps its accent wash. `npm run qa`: 0 violations in 390 screens.

### 2026-10-17: headings after a folded section keep their space; light settings cards on mobile

- Folding a section also hides the blank line before the next heading, so a heading that closed a deeper folded section sat 16px under it, where an open section leaves 40px. Default Obsidian does the same, in reading view and live preview. A heading after a folded deeper section now gets `--heading-spacing` above it, the space reading view gives a heading after text; folded headings of one level stay 16px apart, like an outline. Live preview has no class on a folded line, so the rule finds it with `:has()` on the line's own fold indicator.
- Mobile settings group their rows on cards, which Obsidian draws as `--background-primary` on `--background-secondary`. Tela makes those one colour, so in light mode the cards vanished and only the dividers marked a group. They're white now, as dark mode's are lifted toward white.
- The Distinct sidebars description no longer refers to a setting in the Tela app that people who don't use it won't know.
- Checked on Obsidian 1.14.4: in live preview and reading view, an H2 after a folded H3 measures 40px of space above it, the same as after an open section, and folded H2s in a row stay 16px apart. Mobile settings cards measure `#fff` on `#f7f8fa` in light mode on phone and tablet. `npm run qa`: 0 violations in 390 screens.

### 2026-10-17: emphasis in headings keeps their colour

- A bold or italic run in a heading keeps the heading's colour, where bold took its near-body ink since 1.0.0: in a blue H1 or H2, a bold word read as a smaller, different heading. Links in a heading keep the link colour.
- Checked on Obsidian 1.14.4: bold and italic runs in an H2 measure the heading's colour in both modes and views, while bold in body text keeps its tint.

## 1.1.0 (2026-10-17)

### 2026-10-17: screenshots show 1.1.0 and every heading level

- The README's screenshots and cover are captured again on 1.1.0, after the tab changes. Two new ones, `headings-dark` and `headings-light`, show H1 to H6, each over a paragraph: the others showed nothing below H2. `npm run shots` takes them from the demo vault's Tour.
- `assets/compare-1.1.0.webp` puts the reading note in 1.0.0 and 1.1.0 side by side, for the release notes.
- Checked: `npm run qa` on the release, Obsidian 1.14.4: 0 violations in 378 screens.

### 2026-10-16: the accent marks where you are; callouts and quotes take Tela's bar

- "You are here" is Tela's selected card, the accent at 16%, where it was a grey wash: the open note in the file tree and Notebook Navigator, the open settings page, the active sidebar view and a toggled header button (sort, auto-reveal). Menus highlight in the accent at 18%, the command palette and suggestions at 16%, as Tela's context menu and palette do, and a destructive menu item in red. Hover stays grey, so the row under the pointer and the selected one differ in hue, not just in strength.
- Notebook Navigator keeps its focus cue: the focused pane's selection stays the text-selection blue, and an unfocused one takes the accent wash instead of grey.
- While rows are picked for a batch action (alt-click, shift-click), the open note steps back to the hover wash. Obsidian leaves it out of the pick, and in the accent it would look picked too: the open note and the picked rows were within a shade of each other.
- A highlighted destructive menu item and the quick switcher's "Enter to create" hint take their colour moved 40% toward the body ink. Plain error red and the accent sat at 3.4:1 and 3.0:1 on their washes in light mode (1.0.0, on grey: 3.9:1 and 3.1:1); they now hold 5.5:1 and 5.2:1, and 6.7:1 and 6.9:1 in dark mode.
- A picked row's file-type badge (CANVAS, BASE) takes the row's ink, as Obsidian does for a dragged row. Muted ink on the selection sat under 4.5:1 in 1.0.0 too, down to 3.8:1 with Distinct sidebars in light mode. QA marked rows as open, never as picked, so it missed them; two new scenes, `picked-explorer` and `distinct-picked-explorer`, pick every row but the open note, and fail on 1.0.0 in both modes.
- In light mode, accent fills (primary buttons such as Install and Create, toggles, the plugin browser's "Installed") use the accent itself, `#096cdc`, where Obsidian uses a lighter step, `#0978ee`. White on the lighter step is 4.3:1, and no ink reaches 4.5:1 on it; on the accent it is 5.0:1, and hover darkens to 6.4:1 instead of lightening. No QA scene showed one, so 1.0.0 shipped this; a new scene, `settings-sync`, audits the Sync tab's "Sign up", which fails on 1.0.0 (4.25:1) and passes now. The selection washes keep mixing from the lighter step, so text on them is unchanged.
- With **Distinct sidebars** in light mode, the selected row is the wash laid on the note's ground, since on the recess itself muted text would drop to 4.1:1.
- Callouts are Tela's request card: a faint neutral box, radius 8, with a 4px rounded bar in the callout's colour, inset from the edges, where 1.0.0 tinted the whole box. Text starts 22px in rather than the card's 16, which crowds the bar beside note text. Light-mode titles keep their deeper ink: on the new box cyan, orange and purple would sit near 4.3–4.4:1.
- Code in a callout sits on the note's own ground. Obsidian's code ground is within a step of the card's, so inline code and code blocks lost their box, and in dark mode a code block all but vanished. On the ground they keep it, at the contrast they have outside the callout.
- Quotes take the same bar in faint ink, in reading view and live preview, in place of Obsidian's 2px accent line. Note embeds keep that line: an embed frames a whole note, and a bar there would stack with the bars of the quotes and callouts inside it.
- The bars are borders, not fills. axe skips short text, such as callout titles and inline code, inside an element with a large filled pseudo-element, so filled bars would have taken callout titles out of `npm run qa`.
- Checked: `npm run qa` on Obsidian 1.14.4 with every 1.1.0 change merged, 0 violations in 378 screens, callout titles included. Notebook Navigator's selected rows, which axe can't read, measure 5.01:1 or better, focused and unfocused, with and without Distinct sidebars. In right-to-left notes the callout's text keeps clear of the bar. A walk through the demo vault, 1.0.0 against this change in dark and light, on desktop, phone and tablet, covers the states the audit doesn't reach: rows picked for a batch action, toggled header buttons, menus with a submenu and a destructive item, typed palette and switcher queries, link and tag suggestions, a plugin's settings page, the plugin browser, Bases' toolbar, the cursor inside a quote and a callout, source mode, embeds, a hover preview, a canvas card, a pinned tab and the phone menu. The fixes above for picked rows, the destructive item, the create hint and code in callouts came out of it. The baseline in `qa/obsidian-baseline.json` now covers the variables and classes these changes use, so the weekly check watches them too.

### 2026-10-15: document tabs meet the strip's edges

- Desktop document tabs lose the outer top and side gaps, bringing the active accent line to the top edge like Tela. Inside the tab, the title and the close icon sit 10px from its edges, as in Tela. The change excludes stacked tabs, sidebar tabs and mobile layouts, and preserves Obsidian's space for window controls.
- With the left sidebar collapsed, the first tab starts at the ribbon's edge, in line with the note, where it sat 8px further in. Obsidian pads the window's top-left tabs by 8px plus the room macOS keeps for its window buttons; the room stays, and right-to-left layouts are unchanged. With the ribbon hidden, the sidebar toggle sits in the tab strip and the 8px centres it, so it stays there too, as in Obsidian's default theme.
- The active tab is a neutral grey. It was mixed in oklch, which gave it a red cast in both modes (dark `rgb(24,20,21)` on `rgb(13,14,17)`); mixed in sRGB, as Tela's wash is, it is `rgb(23,24,27)`.
- Checked in Obsidian 1.14.4 in dark and light mode: 196 screens, zero axe violations across reading, editing, title bar, right-to-left text and mobile drawer scenes on desktop, phone and tablet, without community plugins. Measured zero top and side gaps in split panes, compared stacked and sidebar spacing with the previous theme, and clicked the new-tab and close controls. Regenerated the README images and added a before/after comparison in `assets/tabs-spacing.webp`.

### 2026-10-15: Android date icons clear the text

- Reserve space for the native calendar icon in Android date and date/time inputs, including right-to-left layouts. Obsidian pins the icon to the left but omits desktop padding on Android, so it overlapped empty placeholders and filled values. Reported in a screenshot from a real phone and reproduced with Obsidian’s default theme too.
- QA now measures native icon and text bounds for empty and filled date/time properties. Android scenes explicitly exercise `is-android`; ordinary mobile emulation keeps desktop padding and missed the bug. The regression fails before the fix in both text directions; all 14 date-input cases pass after it on Obsidian 1.14.4, in dark and light mode on desktop, phone and tablet.

## 1.0.0 (2026-10-09)

The first public release.

### 2026-10-09: dark faint text with a margin

- Dark-mode faint is `#808497`, up from `#7c8091`. The old value cleared 4.5:1 on the base (4.92:1) but only 4.56:1 on panels, and axe measured the phone drawer's file-type badges at 4.43–4.48:1 against a slightly lighter ground. The new value holds 4.54:1 up to `#1c1d21`, stays below muted (`#8b90a3`), and is about 2% lighter.
- `npm run qa` on Obsidian 1.14.4: 0 violations in 346 screens.

### 2026-10-09: Distinct sidebars reaches the light phone drawer

- With **Distinct sidebars** on, the file drawer on phone and tablet now takes the recessed surface in light mode too. Obsidian paints the drawer with `--mobile-sidebar-background`, which it points at `--background-secondary` in dark mode but at `--background-primary` in light, so the setting only reached the dark drawer.
- Found on a real phone (Pixel 9a, Obsidian 1.14.4): the light drawer stayed `#f7f8fa` with the setting on; it is now `#e6e7e9`, with the selected row lifting to the note's ground.

### 2026-10-09: Obsidian 1.14.4 certified again

- `npm run qa` on 1.14.4 after the heading, bold and tree changes: 0 violations across 340 screens, dark and light, desktop, phone and tablet. The baseline in `qa/obsidian-baseline.json` now covers the variables those changes use (`--h1-color` to `--h3-color`, `--bold-color`, `--link-color`), so the weekly check watches them too.

### 2026-10-09: Notebook Navigator in QA, its dates readable in light mode

- `npm run qa` installs Notebook Navigator (1M downloads, the most used replacement for the file explorer) and audits its view, now that the theme leaves the file tree to plugins.
- Its first run failed in light mode: dates and tag pills sat at 3.09:1, because the plugin draws secondary text in body ink at 50%. The theme now sets its `--nn-theme-foreground-faded` to muted ink, which holds AA in both modes. 0 violations on desktop, phone and tablet, dark and light.

### 2026-10-09: "easy to read, easy to scan"

- The cover tagline, README and package description lead with "easy to read, easy to scan" instead of "calm, legible". The theme isn't calm (accent headings, tinted bold, coloured callouts), and users say "readable" about themes but "legible" only about fonts. "Scan" names what the heading change is for.
- The README's first two "Why Tela" points are merged into one about reading and scanning, followed by "Ready as installed".
- Regenerated the cover.

### 2026-10-09: a thumbnail for the theme browser

- `npm run shots` also writes `assets/screenshot.png`, the 512×288 thumbnail Obsidian's theme browser shows: a 1024×576 window on the dark note, captured at 2x and scaled down. The submission form asks for it.
- Regenerated every image, which still showed white headings and the file-tree marks from before the heading and tree changes.

### 2026-10-09: a whisper of accent on bold

- Bold text mixes 16% of the accent into body ink: enough to catch, quieter than h3 (28%), so a bold run is not a heading and not a link. Links that are also bold keep the link colour. Colour is Obsidian's `--bold-color`, and a selector so it still applies inside quotes (live preview paints those lines as quote ink, which outranked bold).

### 2026-10-09: file tree left to icon plugins

- The theme no longer draws folder or file-type marks in the file explorer. Obsidian's chevrons and badges are back, and icons are left to a plugin such as Iconize. A CSS theme cannot ship live Lucide, and a companion plugin would have been a second install.
- **Classic tree icons** is gone from Style Settings; it only existed to turn those marks off.

### 2026-10-09: headings that scan as a skeleton

- H1 and H2 take the accent colour, with a 1px hairline under them in the border colour. H3 mixes the accent into body ink so a subsection is not another paragraph. H4 stays with the paragraph; H5 and H6 stay muted. Before, H1–H4 were body ink and only size set them apart.
- H2 uses the same colour as H1, because many notes never use H1 and open at a second-level heading. The hairline is not accent-coloured, and H3 does not get one.
- Colour is Obsidian's `--h1-color` / `--h2-color` / `--h3-color` (and `--text-accent`, already AA on both grounds). The line needs a selector: reading view, print, and the live-preview heading line. Picked from a preview of colour, hairlines, left rails and weight, on a living project note and the Style Guide, dark and light.

### 2026-10-07: `npm run shots` regenerates the README images

- One command rebuilds the cover and every screenshot in `assets/` from the demo vault, in a throwaway Obsidian with a temporary profile and vault copy, in about 40 seconds. Before, the images were made by hand with scripts that weren't kept, so any visible change left them stale.
- On WSL it drives the Windows app, for its text rendering, and stops only the processes started with its own profile; elsewhere it uses the Linux app. The cover's layout lives in `scripts/shots-cover.html` and is rendered by the same Obsidian, inside a shadow root so the theme's CSS can't reach it, in the Inter Obsidian bundles: no browser or font install needed.
- The code that finds and caches Obsidian's app packages moved from `qa/run.mjs` to `qa/obsidian.mjs`, shared by both.
- Regenerated every image with the 8px tree gap. Checked: the new images match the previous ones apart from the gap; a cold single-shot run and a full run both pass, on Windows and Linux; no Obsidian process or temporary folder is left behind.

### 2026-10-07: room between tree marks and labels

- File and folder labels in the tree sit 8px after their mark, was 4px: the gap Obsidian puts between an icon and its label in menus, the settings sidebar and the quick switcher. Obsidian's own 4px suits its 10px chevron but crowded a 16px mark. Classic tree icons keep Obsidian's spacing.
- Picked from a preview of 4, 6 and 8px in dark and light. Measured afterwards: 8px from the mark's box to the label, for files and folders. `npm run qa` on the explorer, drawer, menu, Iconize and right-to-left scenes: 0 violations.

### 2026-10-07: a cover and screenshots for the README

- The README opens with a cover: the theme's name beside a reading note in dark mode, the Library base's book covers in light mode, and the note on a phone. A gallery follows: notes and properties, Bases cards, the task marks and code, plus three phone screens.
- Every image is from the demo vault, captured at 2x in Obsidian 1.14.4 on Windows, for its text rendering. The cover is laid out in HTML and rendered by Edge, with Inter, the theme's font. Desktop shots are 1200x800 and phone shots 900x1600, the community directory's sizes. They are stored as lossless WebP in `assets/`, under 1 MB together and pixel-identical to the captures.
- The demo's Frankenstein note is now a full reading note, so the screenshots show real use rather than a test page: properties, a quote from the novel, a question callout, tasks in several states and a link.

### 2026-10-07: a README for users, lint without warnings

- The README now covers what a user needs: why the theme, features, settings, fonts, compatibility and how to verify a release. Development, QA, the Obsidian update check and releasing moved to `CONTRIBUTING.md`, and the README links its claims about the contrast audit and the update check there.
- `npm run lint` reports nothing: 0 errors, 0 warnings. The four warnings came from the print rules' `break-inside` and `break-after`, which the lint marks as partly supported because of breaks between columns; Chromium honours them between pages, as the 7-page PDF export showed. Each line carries a disable comment with that reason.
- Removed leftovers: the empty `screenshots/` folder from the sample theme, and an unlinked tree screenshot in `docs/`.
- `package.json` is marked private, with a description, licence and repository.

### 2026-10-07: text on hovered and selected rows clears AA

- Faint text (result counts, row subtext, menu and list descriptions) cleared 4.5:1 on every ground but not under the hover and selection washes laid over a row: 3.7 to 4.9:1 across both modes. A hovered or selected row now shows it in muted ink, as Obsidian already does for file-type badges. Muted under the washes: 4.8:1 or more in dark mode, 4.6:1 or more on the light base.
- In light mode with Distinct sidebars, the washes darkened rows on the recess so far that muted text, Obsidian's file-type badges included, fell to 3.96:1. Rows there now lift toward the note's ground instead of darkening: halfway on hover, all the way when selected. Muted text sits at 5.3 to 5.75:1, and a selected row stands off the recess as clearly as before (1.16:1, was 1.11:1). Picked from a before/after preview.
- `npm run qa` gains four scenes that select every row in the file explorer and in search results, with and without Distinct sidebars, so the washes are audited on purpose rather than when a leftover pointer happens to rest on a row. The selection wash is the deeper of the two, so it covers hover too.
- Full run on Obsidian 1.14.4 with the plugins: 340 screens, 0 violations, dark and light, on desktop, phone and tablet.
- The selected-row scenes now undo their selection when the next scene starts. At first it carried over, so every later screen in a run showed the explorer's rows selected. The audits stayed valid, since a selected row is the harder ground, but the screenshots didn't show the theme as a user sees it.

### 2026-10-07: surfaces themes forget: print, plugins, title bar, right-to-left

- `npm run qa` gains scenes for printing and PDF export, the frameless title bar with both sidebars collapsed, right-to-left text in reading view and live preview, and five popular plugins: Dataview, Tasks, Kanban, Excalidraw and Iconize. Canvas, Bases, Properties, phone and tablet were already covered.
- The plugins are downloaded from their GitHub releases, cached, installed into the temporary vault and turned on, so every scene runs with them, as many users' vaults do. Their notes and settings are in `qa/fixtures/`, not `demo/`, which stays plugin-free. `--no-plugins` skips them.
- The vault's first open asks "Do you trust the author of this vault?" when it comes with plugins, and holds back the plugins and the theme until it is answered. The harness answers it.
- The print scene renders the note with Obsidian's own PDF export renderer, in light mode as the export does, with print media emulated. One real export of the Tour, checked page by page, came out as 7 A4 pages.
- Printing and PDF export keep a callout, code block, table, maths block, diagram or image on one page, and a heading with the text after it. Before, callouts were cut across page breaks.
- With Iconize, a file that has an icon shows Iconize's icon instead of the theme's file-type mark; the two had sat side by side and pushed the label out of line. Folders keep the folder mark, which opens and closes them, beside Iconize's icon, as Obsidian keeps its chevron. The rule uses `:has()`, limited to a direct child of the row; the directory's lint warns on `:has()`, so the line carries a disable comment with the reason.
- The print scene audits each block of the note once, on the first screen that shows it whole: the print view renders the whole note at once, so auditing all of it on every screen reported over 1,200 off-screen elements as undecided. All 68 blocks of the Tour are audited.
- Full run on Obsidian 1.14.4 with the plugins: 316 screens, one violation. Faint text on a hovered search result in phone dark mode was at 4.48:1, where the pointer left over from an earlier scene rested on the row. Faint text clears 4.5:1 on every ground but not on the hover and selection washes laid over them (3.7 to 4.9:1 across both modes). That is a colour change, so it is left for its own change.
- Checked by eye, with no change needed: Dataview tables and task lists, Tasks query results (which show the alternate task marks), Kanban lanes and cards, Excalidraw's toolbars, the title bar buttons, and right-to-left lists, tasks, quotes, callouts and tables.

### 2026-10-07: alternate task states

- Twenty task markers now have a mark of their own, in two kinds, each drawn one way.
- Status markers keep a filled box with a heavy glyph, like the done tick: `[!]` important (attention orange), `[?]` question (warn), `[/]` in progress (a half-filled accent box), and the parked states in grey: `[-]` cancelled, `[>]` forwarded (arrow) and `[<]` scheduled (calendar). `[>]` and `[<]` are new.
- Annotation markers drop the box for a bare 16px Lucide glyph, the size and stroke of the file tree's marks: `[*]` star, `["]` quote, `[l]` location, `[b]` bookmark, `[i]` information, `[S]` savings, `[I]` idea, `[p]` pro, `[c]` con, `[f]` fire, `[k]` key, `[w]` win, `[u]` up and `[d]` down. Their text stays unstruck, as Obsidian only strikes `[x]`.
- Every glyph clears 3:1 against the note background, the WCAG minimum for non-text marks: 5.8:1 or more in dark mode, 4.7:1 or more in light. Light mode's yellow is 2.96:1, so yellow glyphs (star, idea, key) take the warn colour instead.
- Each state now sets custom properties on its checkbox (`--checkbox-color`, `--checkbox-marker-color`, `--tela-task-glyph`), and one rule draws the glyph. Markers without a mark of their own get a check.
- The selectors still name four places per state. In reading view Obsidian 1.14 puts `data-task` on the list item, not the checkbox, so `input[data-task]` alone would miss it.
- The demo Tour lists every state.

### 2026-10-07: heading levels you can tell apart

- Heading sizes are 1.6, 1.4, 1.25, 1.125, 1 and 0.875em, up from 1.5, 1.3, 1.15, 1.05, 1 and 0.9. Every heading stays at weight 600.
- Every pair of neighbouring levels now differs by a cue of its own. Sizes step at least 11% down to h4. Before, h4 was 1.05em: 5% above h5, and barely larger than a bold paragraph. h5 sits at body size in muted ink. h6 is a small capitalised label, muted and letter-spaced.
- Capitals come from `text-transform` on Obsidian's own heading selectors (`.markdown-rendered h6`, `.cm-header-6`): no variable covers it, and small caps through `--h6-variant` rendered about 8px tall.
- Picked from a preview of three ladders (the old one, Obsidian's golden-section steps, and this one) in dark and light mode. Under Obsidian's steps, h5 and h6 differed by 7.6% and h6 was body size.

### 2026-10-07: contributing guide, issue forms, attested releases, minimum Obsidian 1.13.4

- `minAppVersion` is 1.13.4, was 1.10.6, which had never been tested. 1.13.4 is the first public 1.13 desktop release, and nothing older can work: the hover and selection washes are mixed from `--mono-100`, which first ships in 1.13.
- Verified with `npm run qa -- --obsidian 1.13.4` and `1.13.7`: 0 violations and no scene errors in 90 scene runs each, dark and light, on desktop, phone and tablet. Screens on 1.13.4 match 1.14.4 apart from Obsidian's own layout changes, such as 1.14 grouping settings into cards. `--sidebar-tab-container-background`, which only 1.14 reads, makes no visible difference, since the sidebars already share the base colour.
- `CONTRIBUTING.md` covers reporting a problem, the theme's three principles (variables first, few settings, readable text) and the checks to run before a pull request.
- Issue forms: the bug form asks for Obsidian and theme versions, platform, mode, plugins and snippets, theme settings and a screenshot. Blank issues are off, and Obsidian's own problems point to the forum.
- The release workflow attests build provenance for `theme.css` and `manifest.json` with `actions/attest@v4`. The step only runs once the repository is public, since GitHub stores attestations only for public repositories (or Enterprise Cloud).
- The README gains Why Tela, Features, Settings, Fonts and Compatibility sections, and how to verify a release.

### 2026-10-07: light-mode faint text clears AA on every ground

- Light mode's faint text (`--tela-faint`) is `#5e6772`, was `#666f79`. It is still muted blended into the base, but now stops where it clears 4.5:1 on the darkest ground it sits on: the recessed sidebars of the Distinct sidebars option.
- The first QA run found it at 4.12:1 there (a file-type badge, a search result count, the "Unlinked mentions" header) and at 4.28:1 in the phone file menu. Now: 4.64:1 on the recess, 4.82:1 in the phone menu, 4.90:1 on panels, 5.13:1 on code blocks and 5.40:1 on the base. Dark mode is unchanged.
- Verified with `npm run qa` on Obsidian 1.14.4: 0 violations in every scene, dark and light, on desktop, phone and tablet.

### 2026-10-07: QA fixes

- Settings opens as a modal in the main window during QA. On desktop, Obsidian 1.14 opens it in a window of its own, so the first run never audited it.
- Every scene starts from an empty tab. A note reopened in its own tab comes back at its last scroll position, so a scene after a paged one could start at the end of the note.
- Screens are captured once running transitions finish and the link index has settled, so a canvas's links reach the backlinks scene.
- Reports describe `link-in-text-block` failures as a link colour against its surrounding text colour, not as text on a background.
- Overlay scenes (command palette, menu, page preview, settings) audit only the overlay; the screen behind it is audited in the other scenes.
- Contact sheets scale screenshots down as they are read: 30 tablet screens overran ImageMagick's memory limit and one sheet was missing. `--out` writes a run to another folder without emptying it.
- Re-run on Obsidian 1.14.4: the same 5 light-mode violations. Elements axe couldn't decide fell from 52–77 to 20–24 per device and mode.

### 2026-10-07: Obsidian update check

- `npm run drift` checks an Obsidian release for changes that would quietly break the theme. It fails if Obsidian no longer reads a variable the theme sets, no longer defines one the theme reads, or no longer uses a class or attribute the theme styles. It also reports Obsidian's changed defaults for those variables, followed down `var()` chains, against `qa/obsidian-baseline.json`.
- The baseline certifies Obsidian 1.14.4, the release the QA harness covers: 94 variables the theme sets, 14 it reads, 19 classes and attributes, and 123 defaults.
- A workflow runs the check every Monday on the newest release and files what it finds as an issue labelled `obsidian-update`.
- Verified against a baseline certified on 1.12.7: checking 1.13.4 flags `--callout-default`, behind `--callout-color`, changing from `var(--color-blue-rgb)` to `var(--color-blue)`, and the same change in the other callout colours. The theme's light-callout titles depend on that change. Checking 1.14.4 against its own baseline finds nothing.
- Found along the way: `--mono-100`, which the hover and selection washes are mixed from, first ships in 1.13, and `--sidebar-tab-container-background` in 1.14. The manifest's `minAppVersion` is still 1.10.6.

### 2026-10-07: tree text in the Tela app's list inks

- File tree labels use the Tela app's rail-title ink (foreground at 86%) instead of Obsidian's muted grey, and the marks use its icon ink (muted) instead of faint. The tree had read washed out next to body text.
- The ink is Obsidian's tree-row colour (`--nav-item-color`), so the other sidebar trees, such as bookmarks, search results and backlinks, brighten with it.
- Contrast on the tree background: labels 6.1:1 → 11.7:1 dark, 5.8:1 → 9.7:1 light; marks 4.9:1 → 6.1:1 dark, 4.8:1 → 5.8:1 light. No new colours.
- Verified in Obsidian 1.14.4, dark and light, at 100% scaling, by comparing computed colours and before/after screenshots.

### 2026-10-06: QA harness and demo vault

- `npm run qa` opens the demo vault in a throwaway Obsidian, with a temporary profile and a temporary copy of the vault. It renders 16 scenes in dark and light, on desktop, phone and tablet: notes in reading view and live preview, properties, Canvas, Bases tables and cards, search, backlinks, the command palette, a file menu, a page preview, graph, settings, the mobile drawer and the Distinct sidebars option. Every screen gets an axe audit of text contrast and link distinction, and the run exits 1 on any violation. `--obsidian <version>` tests another app version.
- Long notes are audited a screen at a time, because Obsidian only renders what is near the viewport. Two layers are hidden during the audit because they stop axe from finding the background: the transparent click blocker over Canvas cards and the fade at the foot of mobile drawers.
- `demo/` is a vault of our own content: a tour of every Markdown element, callout type and task state, a note with every property type, a canvas with all six card colours, a library base with table and cards views, a Kanban board, and generated images and audio. `npm run build` installs the theme into it.
- First run, on Obsidian 1.14.4: 240 screens, no violations in dark mode. Light mode has 5, all in faint text: 4.12:1 on the Distinct sidebars surface (a file-type badge, a result count, the "Unlinked mentions" header) and 4.28:1 in the phone file menu. The fix changes a colour, so it gets its own PR.

### 2026-10-06: file tree marks

- Folders show a closed or open folder glyph instead of the collapse chevron. Every file shows a glyph for its type: note, canvas, base, PDF, image, or a generic file. Known types drop their text badge; unknown types keep it. The active file's glyph takes the accent colour.
- **Classic tree icons** in Style Settings brings back Obsidian's chevrons and badges.
- The glyphs are 16px Lucide icons with Lucide's 2-unit stroke, the size and weight of Obsidian's own icons. A first draft used 12px glyphs with a 2.5-unit stroke. Those render 1.25px wide, which never lands on whole pixels, so they looked small and blurred.
- Verified in Obsidian 1.14.4, dark and light, at 100%, 125%, 150% and 200% scaling. At 100%, every glyph of a type renders pixel-identically in every row.
