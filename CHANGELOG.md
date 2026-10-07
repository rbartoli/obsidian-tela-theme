# Changelog

## Unreleased

### 2026-10-07: surfaces themes forget: print, plugins, title bar, right-to-left (#18)

- `npm run qa` gains scenes for printing and PDF export, the frameless title bar with both sidebars collapsed, right-to-left text in reading view and live preview, and five popular plugins: Dataview, Tasks, Kanban, Excalidraw and Iconize. Canvas, Bases, Properties, phone and tablet were already covered.
- The plugins are downloaded from their GitHub releases, cached, installed into the temporary vault and turned on, so every scene runs with them, as many users' vaults do. Their notes and settings are in `qa/fixtures/`, not `demo/`, which stays plugin-free. `--no-plugins` skips them.
- The vault's first open asks "Do you trust the author of this vault?" when it comes with plugins, and holds back the plugins and the theme until it is answered. The harness answers it.
- The print scene renders the note with Obsidian's own PDF export renderer, in light mode as the export does, with print media emulated. One real export of the Tour, checked page by page, came out as 7 A4 pages.
- Printing and PDF export keep a callout, code block, table, maths block, diagram or image on one page, and a heading with the text after it. Before, callouts were cut across page breaks.
- With Iconize, a file that has an icon shows Iconize's icon instead of the theme's file-type mark; the two had sat side by side and pushed the label out of line. Folders keep the folder mark, which opens and closes them, beside Iconize's icon, as Obsidian keeps its chevron. The rule uses `:has()`, limited to a direct child of the row; the directory's lint warns on `:has()`, so the line carries a disable comment with the reason.
- The print scene audits each block of the note once, on the first screen that shows it whole: the print view renders the whole note at once, so auditing all of it on every screen reported over 1,200 off-screen elements as undecided. All 68 blocks of the Tour are audited.
- Full run on Obsidian 1.14.4 with the plugins: 316 screens, one violation. Faint text on a hovered search result in phone dark mode was at 4.48:1, where the pointer left over from an earlier scene rested on the row. Faint text clears 4.5:1 on every ground but not on the hover and selection washes laid over them (3.7 to 4.9:1 across both modes). That is a colour change, so it is left for its own change.
- Checked by eye, with no change needed: Dataview tables and task lists, Tasks query results (which show the alternate task marks), Kanban lanes and cards, Excalidraw's toolbars, the title bar buttons, and right-to-left lists, tasks, quotes, callouts and tables.

### 2026-10-07: alternate task states (#17)

- Twenty task markers now have a mark of their own, in two kinds, each drawn one way.
- Status markers keep a filled box with a heavy glyph, like the done tick: `[!]` important (attention orange), `[?]` question (warn), `[/]` in progress (a half-filled accent box), and the parked states in grey: `[-]` cancelled, `[>]` forwarded (arrow) and `[<]` scheduled (calendar). `[>]` and `[<]` are new.
- Annotation markers drop the box for a bare 16px Lucide glyph, the size and stroke of the file tree's marks: `[*]` star, `["]` quote, `[l]` location, `[b]` bookmark, `[i]` information, `[S]` savings, `[I]` idea, `[p]` pro, `[c]` con, `[f]` fire, `[k]` key, `[w]` win, `[u]` up and `[d]` down. Their text stays unstruck, as Obsidian only strikes `[x]`.
- Every glyph clears 3:1 against the note background, the WCAG minimum for non-text marks: 5.8:1 or more in dark mode, 4.7:1 or more in light. Light mode's yellow is 2.96:1, so yellow glyphs (star, idea, key) take the warn colour instead.
- Each state now sets custom properties on its checkbox (`--checkbox-color`, `--checkbox-marker-color`, `--tela-task-glyph`), and one rule draws the glyph. Markers without a mark of their own get a check.
- The selectors still name four places per state. In reading view Obsidian 1.14 puts `data-task` on the list item, not the checkbox, so `input[data-task]` alone would miss it.
- The demo Tour lists every state.

### 2026-10-07: heading levels you can tell apart (#16)

- Heading sizes are 1.6, 1.4, 1.25, 1.125, 1 and 0.875em, up from 1.5, 1.3, 1.15, 1.05, 1 and 0.9. Every heading stays at weight 600.
- Every pair of neighbouring levels now differs by a cue of its own. Sizes step at least 11% down to h4. Before, h4 was 1.05em: 5% above h5, and barely larger than a bold paragraph. h5 sits at body size in muted ink. h6 is a small capitalised label, muted and letter-spaced.
- Capitals come from `text-transform` on Obsidian's own heading selectors (`.markdown-rendered h6`, `.cm-header-6`): no variable covers it, and small caps through `--h6-variant` rendered about 8px tall.
- Picked from a preview of three ladders (the old one, Obsidian's golden-section steps, and this one) in dark and light mode. Under Obsidian's steps, h5 and h6 differed by 7.6% and h6 was body size.

### 2026-10-07: contributing guide, issue forms, attested releases, minimum Obsidian 1.13.4 (#15)

- `minAppVersion` is 1.13.4, was 1.10.6, which had never been tested. 1.13.4 is the first public 1.13 desktop release, and nothing older can work: the hover and selection washes are mixed from `--mono-100`, which first ships in 1.13.
- Verified with `npm run qa -- --obsidian 1.13.4` and `1.13.7`: 0 violations and no scene errors in 90 scene runs each, dark and light, on desktop, phone and tablet. Screens on 1.13.4 match 1.14.4 apart from Obsidian's own layout changes, such as 1.14 grouping settings into cards. `--sidebar-tab-container-background`, which only 1.14 reads, makes no visible difference, since the sidebars already share the base colour.
- `CONTRIBUTING.md` covers reporting a problem, the theme's three principles (variables first, few settings, readable text) and the checks to run before a pull request.
- Issue forms: the bug form asks for Obsidian and theme versions, platform, mode, plugins and snippets, theme settings and a screenshot. Blank issues are off, and Obsidian's own problems point to the forum.
- The release workflow attests build provenance for `theme.css` and `manifest.json` with `actions/attest@v4`. The step only runs once the repository is public, since GitHub stores attestations only for public repositories (or Enterprise Cloud).
- The README gains Why Tela, Features, Settings, Fonts and Compatibility sections, and how to verify a release.

### 2026-10-07: light-mode faint text clears AA on every ground (#14)

- Light mode's faint text (`--tela-faint`) is `#5e6772`, was `#666f79`. It is still muted blended into the base, but now stops where it clears 4.5:1 on the darkest ground it sits on: the recessed sidebars of the Distinct sidebars option.
- The first QA run found it at 4.12:1 there (a file-type badge, a search result count, the "Unlinked mentions" header) and at 4.28:1 in the phone file menu. Now: 4.64:1 on the recess, 4.82:1 in the phone menu, 4.90:1 on panels, 5.13:1 on code blocks and 5.40:1 on the base. Dark mode is unchanged.
- Verified with `npm run qa` on Obsidian 1.14.4: 0 violations in every scene, dark and light, on desktop, phone and tablet.

### 2026-10-07: QA fixes (#10, #12, #13)

- Settings opens as a modal in the main window during QA. On desktop, Obsidian 1.14 opens it in a window of its own, so the first run never audited it.
- Every scene starts from an empty tab. A note reopened in its own tab comes back at its last scroll position, so a scene after a paged one could start at the end of the note.
- Screens are captured once running transitions finish and the link index has settled, so a canvas's links reach the backlinks scene.
- Reports describe `link-in-text-block` failures as a link colour against its surrounding text colour, not as text on a background.
- Overlay scenes (command palette, menu, page preview, settings) audit only the overlay; the screen behind it is audited in the other scenes.
- Contact sheets scale screenshots down as they are read: 30 tablet screens overran ImageMagick's memory limit and one sheet was missing. `--out` writes a run to another folder without emptying it.
- Re-run on Obsidian 1.14.4: the same 5 light-mode violations. Elements axe couldn't decide fell from 52–77 to 20–24 per device and mode.

### 2026-10-07: Obsidian update check (#11)

- `npm run drift` checks an Obsidian release for changes that would quietly break the theme. It fails if Obsidian no longer reads a variable the theme sets, no longer defines one the theme reads, or no longer uses a class or attribute the theme styles. It also reports Obsidian's changed defaults for those variables, followed down `var()` chains, against `qa/obsidian-baseline.json`.
- The baseline certifies Obsidian 1.14.4, the release the QA harness covers: 94 variables the theme sets, 14 it reads, 19 classes and attributes, and 123 defaults.
- A workflow runs the check every Monday on the newest release and files what it finds as an issue labelled `obsidian-update`.
- Verified against a baseline certified on 1.12.7: checking 1.13.4 flags `--callout-default`, behind `--callout-color`, changing from `var(--color-blue-rgb)` to `var(--color-blue)`, and the same change in the other callout colours. The theme's light-callout titles depend on that change. Checking 1.14.4 against its own baseline finds nothing.
- Found along the way: `--mono-100`, which the hover and selection washes are mixed from, first ships in 1.13, and `--sidebar-tab-container-background` in 1.14. The manifest's `minAppVersion` is still 1.10.6.

### 2026-10-07: tree text in the Tela app's list inks (#8)

- File tree labels use the Tela app's rail-title ink (foreground at 86%) instead of Obsidian's muted grey, and the marks use its icon ink (muted) instead of faint. The tree had read washed out next to body text.
- The ink is Obsidian's tree-row colour (`--nav-item-color`), so the other sidebar trees, such as bookmarks, search results and backlinks, brighten with it.
- Contrast on the tree background: labels 6.1:1 → 11.7:1 dark, 5.8:1 → 9.7:1 light; marks 4.9:1 → 6.1:1 dark, 4.8:1 → 5.8:1 light. No new colours.
- Verified in Obsidian 1.14.4, dark and light, at 100% scaling, by comparing computed colours and before/after screenshots.

### 2026-10-06: QA harness and demo vault (#9)

- `npm run qa` opens the demo vault in a throwaway Obsidian, with a temporary profile and a temporary copy of the vault. It renders 16 scenes in dark and light, on desktop, phone and tablet: notes in reading view and live preview, properties, Canvas, Bases tables and cards, search, backlinks, the command palette, a file menu, a page preview, graph, settings, the mobile drawer and the Distinct sidebars option. Every screen gets an axe audit of text contrast and link distinction, and the run exits 1 on any violation. `--obsidian <version>` tests another app version.
- Long notes are audited a screen at a time, because Obsidian only renders what is near the viewport. Two layers are hidden during the audit because they stop axe from finding the background: the transparent click blocker over Canvas cards and the fade at the foot of mobile drawers.
- `demo/` is a vault of our own content: a tour of every Markdown element, callout type and task state, a note with every property type, a canvas with all six card colours, a library base with table and cards views, a Kanban board, and generated images and audio. `npm run build` installs the theme into it.
- First run, on Obsidian 1.14.4: 240 screens, no violations in dark mode. Light mode has 5, all in faint text: 4.12:1 on the Distinct sidebars surface (a file-type badge, a result count, the "Unlinked mentions" header) and 4.28:1 in the phone file menu. The fix changes a colour, so it gets its own PR.

### 2026-10-06: file tree marks (#4)

- Folders show a closed or open folder glyph instead of the collapse chevron. Every file shows a glyph for its type: note, canvas, base, PDF, image, or a generic file. Known types drop their text badge; unknown types keep it. The active file's glyph takes the accent colour.
- **Classic tree icons** in Style Settings brings back Obsidian's chevrons and badges.
- The glyphs are 16px Lucide icons with Lucide's 2-unit stroke, the size and weight of Obsidian's own icons. A first draft used 12px glyphs with a 2.5-unit stroke. Those render 1.25px wide, which never lands on whole pixels, so they looked small and blurred.
- Verified in Obsidian 1.14.4, dark and light, at 100%, 125%, 150% and 200% scaling. At 100%, every glyph of a type renders pixel-identically in every row.
