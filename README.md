# Tela

An Obsidian theme inspired by the style guide of the Tela app. It supports dark and light
mode.

Work in progress: not yet in the community directory.

## Why Tela

- **Calm, legible and ready as installed.** One quiet surface for sidebars, tabs and
  notes, hairline borders, and nothing to set up.
- **Readable text.** Every text colour clears WCAG AA (4.5:1) in dark and light
  mode, on desktop, phone and tablet. An automated contrast audit of notes, Canvas,
  Bases, search, menus and settings checks this before each release.
- **Built to survive Obsidian updates.** The theme works through Obsidian's own variables
  rather than fragile selectors, and a weekly check tests each new Obsidian release for
  changes that would break it.

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

## Development

Source lives in `src/`, as CSS partials that are joined in filename order. `theme.css` is
generated from them and committed, because releases ship it.

```sh
npm install
npm run build   # src/*.css → theme.css, then copy to the vaults in .env
npm run dev     # same, rebuilding on every change
npm run check   # fail if theme.css is stale (CI runs this)
npm run lint    # stylelint-config-obsidianmd, the same rules the directory review uses
```

To test in a vault, copy `.env.example` to `.env` and set `TELA_THEME_DIRS` to the
vault's theme folder. The folder name must match `name` in `manifest.json`, for example
`<test-vault>/.obsidian/themes/Tela`. Then pick Tela in Settings → Appearance → Themes.
Restart Obsidian after changing `manifest.json`.

The theme has two Style Settings options: **Distinct sidebars** and **Classic tree icons**.

`demo/` is a small vault to try the theme in: a tour of every Markdown element,
properties, a canvas, a base and a Kanban board. `npm run build` installs the theme into
it.

## QA

`npm run qa` opens the demo vault in a throwaway Obsidian and renders every scene in
`qa/scenes.mjs` (notes in reading view and live preview, Canvas, Bases, search, menus,
settings, print, right-to-left text and more) in dark and light mode, on desktop, phone and
tablet. It installs Dataview, Tasks, Kanban, Excalidraw and Iconize into the vault and
renders their views too. Every screen
gets an [axe](https://github.com/dequelabs/axe-core) contrast audit, and the run fails on
any violation. The report, screenshots and contact sheets go to `qa/out/`.

```sh
npm run qa                                  # every scene, on the latest Obsidian
npm run qa -- --obsidian 1.13.4             # another app version
npm run qa -- --device phone --mode light --scene reading,editing
npm run qa -- --no-plugins                  # without the community plugins
```

It needs the Obsidian desktop app (`obsidian` on your `PATH`, or `OBSIDIAN_BIN`) and, for
contact sheets, ImageMagick. Each run uses a temporary profile and a temporary copy of
`demo/` plus `qa/fixtures/`, so it never touches your own vaults or settings. Plugins
are downloaded from their GitHub releases once, then cached. The installer only loads app
versions newer than itself. All options are listed at the top of `qa/run.mjs`.

## Obsidian updates

`npm run drift` checks an Obsidian release for changes that would quietly break the theme.
It fails if Obsidian no longer reads a variable the theme sets, no longer defines one the
theme reads, or no longer uses a class or attribute the theme styles. It also reports
Obsidian's changed defaults for those variables, followed down `var()` chains, against
`qa/obsidian-baseline.json`: the release last certified with `npm run qa`.

```sh
npm run drift                                         # the newest release
npm run drift -- --obsidian 1.14.4 --update-baseline  # certify a release once QA passes on it
```

`.github/workflows/obsidian-canary.yml` runs it every Monday and files what it finds as an
issue labelled `obsidian-update`.

## Releasing

1. Bump the version: `npm version <x.y.z>`. This updates `manifest.json` and
   `versions.json`.
2. Push the tag. `.github/workflows/release.yml` drafts a GitHub release with
   `manifest.json` and `theme.css` attached, and attests their build provenance.
3. Publish the draft.

To check that a downloaded `theme.css` was built by this repository's release workflow:

```sh
gh attestation verify theme.css -R rbartoli/obsidian-tela-theme
```

## Licence

[MIT](LICENSE)
