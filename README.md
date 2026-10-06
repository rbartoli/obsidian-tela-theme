# Tela

An Obsidian theme inspired by the style guide of the Tela app. It supports dark and light
mode.

Work in progress: not yet in the community directory.

## Development

```sh
npm install
npm run lint   # stylelint-config-obsidianmd, the same rules the directory review uses
```

To test, link the repo into a **test** vault's themes folder. The folder name must match
`name` in `manifest.json`:

```sh
ln -s "$PWD" "<test-vault>/.obsidian/themes/Tela"
```

Then pick Tela in Settings → Appearance → Themes. Restart Obsidian after changing
`manifest.json`.

## Releasing

1. Bump the version: `npm version <x.y.z>`. This updates `manifest.json` and
   `versions.json`.
2. Push the tag. `.github/workflows/release.yml` drafts a GitHub release with
   `manifest.json` and `theme.css` attached.
3. Publish the draft.

## Licence

[MIT](LICENSE)
