# Changelog

## Unreleased

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
