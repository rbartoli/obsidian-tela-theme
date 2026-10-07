# Tela

An Obsidian theme inspired by the style guide of the Tela app. It supports dark and light
mode.

Work in progress: not yet in the community directory.

## Why Tela

- **Calm, legible and ready as installed.** One quiet surface for sidebars, tabs and
  notes, hairline borders, and nothing to set up.
- **Readable text.** Every text colour clears WCAG AA (4.5:1) in dark and light
  mode, on desktop, phone and tablet. An
  [automated contrast audit](CONTRIBUTING.md#qa) of notes, Canvas, Bases, search,
  menus and settings checks this before each release.
- **Built to survive Obsidian updates.** The theme works through Obsidian's own variables
  rather than fragile selectors, and a [weekly check](CONTRIBUTING.md#obsidian-updates)
  tests each new Obsidian release for changes that would break it.

## Features

- Dark and light palettes taken from the Tela app, with its blue accent. Your own accent
  colour in Settings → Appearance still applies.
- Code blocks in the colours of Tela's terminal, every one readable on the code
  background.
- A file tree with a glyph for each file type (note, canvas, base, PDF, image) and folders
  that open and close.
- Tasks with their own marks for important `[!]`, question `[?]`, cancelled `[-]` and in
  progress `[/]`.
- Headings at one weight in a gentle size scale, with the two smallest levels in muted ink.
- Unresolved links keep full colour, with a dashed underline instead of fading.
- Phone and tablet keep the desktop palette rather than switching to pure black.
- Printing and PDF export keep callouts, code blocks, tables and images on one page, and
  each heading on the page of the text it introduces.

## Settings

With the [Style Settings](https://github.com/obsidian-community/obsidian-style-settings)
plugin, the theme has two options:

- **Distinct sidebars** gives the sidebars a recessed surface of their own.
- **Classic tree icons** brings back Obsidian's collapse arrows and file-type labels in
  the file tree.

## Fonts

The theme sets Inter, which Obsidian ships with, for the interface and notes, and your
system's monospace font for code. Your choices in Settings → Appearance → Font always win
over the theme's.

## Compatibility

Obsidian 1.13.4 or later, on desktop and mobile. Checked with the Dataview, Tasks, Kanban,
Excalidraw and Iconize plugins, and with right-to-left text. With Iconize, a file that has
an icon shows it in place of the theme's file-type mark.

## Verifying a release

Each release's `theme.css` and `manifest.json` carry signed build provenance. To check
that a downloaded `theme.css` was built by this repository's release workflow:

```sh
gh attestation verify theme.css -R rbartoli/obsidian-tela-theme
```

## Licence

[MIT](LICENSE)
