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

## Releasing

1. Bump the version: `npm version <x.y.z>`. This updates `manifest.json` and
   `versions.json`.
2. Push the tag. `.github/workflows/release.yml` drafts a GitHub release with
   `manifest.json` and `theme.css` attached.
3. Publish the draft.

## Licence

[MIT](LICENSE)
