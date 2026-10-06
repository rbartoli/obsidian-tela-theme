# Changelog

## Unreleased

### 2026-10-06: file tree marks (#4)

- Folders show a closed or open folder glyph instead of the collapse chevron. Every file shows a glyph for its type: note, canvas, base, PDF, image, or a generic file. Known types drop their text badge; unknown types keep it. The active file's glyph takes the accent colour.
- **Classic tree icons** in Style Settings brings back Obsidian's chevrons and badges.
- The glyphs are 16px Lucide icons with Lucide's 2-unit stroke, the size and weight of Obsidian's own icons. A first draft used 12px glyphs with a 2.5-unit stroke. Those render 1.25px wide, which never lands on whole pixels, so they looked small and blurred.
- Verified in Obsidian 1.14.4, dark and light, at 100%, 125%, 150% and 200% scaling. At 100%, every glyph of a type renders pixel-identically in every row.
