# Tela

An Obsidian theme inspired by the style guide of the Tela app. It supports dark and light
mode.

Work in progress: not yet in the community directory.

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
settings and more) in dark and light mode, on desktop, phone and tablet. Every screen
gets an [axe](https://github.com/dequelabs/axe-core) contrast audit, and the run fails on
any violation. The report, screenshots and contact sheets go to `qa/out/`.

```sh
npm run qa                                  # every scene, on the latest Obsidian
npm run qa -- --obsidian 1.13.8             # another app version
npm run qa -- --device phone --mode light --scene reading,editing
```

It needs the Obsidian desktop app (`obsidian` on your `PATH`, or `OBSIDIAN_BIN`) and, for
contact sheets, ImageMagick. Each run uses a temporary profile and a temporary copy of
`demo/`, so it never touches your own vaults or settings. The installer only loads app
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
   `manifest.json` and `theme.css` attached.
3. Publish the draft.

## Licence

[MIT](LICENSE)
