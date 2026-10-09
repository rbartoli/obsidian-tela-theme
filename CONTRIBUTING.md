# Contributing

Thanks for helping. Bug reports, screenshots of something that looks off, and pull
requests are all welcome.

## Reporting a problem

Open an issue with the bug form. Before you do, switch to Obsidian's default theme for a
moment: if the problem stays, it belongs to Obsidian or a plugin, not this theme. If it
appeared after an Obsidian update, say which version you came from.

## What the theme tries to be

These decide most pull requests, so they're worth knowing first:

- **Variables first.** The theme styles Obsidian through its CSS variables wherever one
  exists, and keeps component selectors rare. Selectors are what break when Obsidian
  updates.
- **Few settings.** It should look right with nothing to set up. A change that works
  without a new option is easier to take than one behind a toggle.
- **Readable text.** Every text colour clears WCAG AA (4.5:1) on every background it sits
  on, in dark and light mode. `npm run qa` checks this, and a change that fails it needs
  a different colour, not a weaker check.

## Making a change

Setup and commands are under [Development](#development). In short:

1. Edit the partials in `src/`, never `theme.css`, which is generated.
2. `npm run build` and look at the change in the `demo/` vault, in dark and light mode.
3. Before opening a pull request, run:

   ```sh
   npm run lint    # the directory's own stylelint rules
   npm run check   # theme.css matches src/
   npm run qa      # contrast audit of every scene; needs the Obsidian desktop app
   ```

4. If the change is visible, run `npm run shots` and commit the new images in `assets/`.
5. Add a dated entry at the top of `CHANGELOG.md`: what changed, why, and how you checked
   it.

Keep a pull request to one change, and include before and after screenshots for anything
visible. CI runs `check` and `lint` on every pull request.

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

`demo/` is a small vault to try the theme in: a tour of every Markdown element,
properties, a canvas, a base and a Kanban board. `npm run build` installs the theme into
it.

## QA

`npm run qa` opens the demo vault in a throwaway Obsidian and renders every scene in
`qa/scenes.mjs` (notes in reading view and live preview, Canvas, Bases, search, menus,
settings, selected rows, print, right-to-left text and more) in dark and light mode, on
desktop, phone and tablet. It installs Dataview, Tasks, Kanban, Excalidraw and Iconize
into the vault and renders their views too. Every screen gets an
[axe](https://github.com/dequelabs/axe-core) contrast audit, and the run fails on any
violation. The report, screenshots and contact sheets go to `qa/out/`.

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

## Screenshots

`npm run shots` regenerates the README's cover and screenshots, and the theme browser's
512×288 thumbnail, in `assets/` from the demo vault, in a throwaway Obsidian, in about a
minute. Run it after any visible change.

```sh
npm run shots                        # the cover and every screenshot
npm run shots -- --only cover,tasks-dark
npm run shots -- --platform linux    # the Linux app, even on WSL
```

On WSL it drives the Windows app, for Windows' text rendering, which needs
`networkingMode=mirrored` in `.wslconfig`; elsewhere it uses the Linux app. Desktop shots
are 1200×800 and phone shots 900×1600, the community directory's sizes, captured at 2x and
written as lossless WebP. The cover's layout is `scripts/shots-cover.html`, rendered by
the same Obsidian in the Inter it bundles. Scenes and options are at the top of
`scripts/shots.mjs`.

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

## Releasing (maintainers)

1. Bump the version: `npm version <x.y.z>`. This updates `manifest.json` and
   `versions.json`.
2. Push the tag. `.github/workflows/release.yml` drafts a GitHub release with
   `manifest.json` and `theme.css` attached, and attests their build provenance.
3. Publish the draft.

## Licence

By contributing, you agree that your work is released under the [MIT licence](LICENSE).
