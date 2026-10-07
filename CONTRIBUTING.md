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

Setup and commands are in the [README](README.md#development). In short:

1. Edit the partials in `src/`, never `theme.css`, which is generated.
2. `npm run build` and look at the change in the `demo/` vault, in dark and light mode.
3. Before opening a pull request, run:

   ```sh
   npm run lint    # the directory's own stylelint rules
   npm run check   # theme.css matches src/
   npm run qa      # contrast audit of every scene; needs the Obsidian desktop app
   ```

4. Add a dated entry at the top of `CHANGELOG.md`: what changed, why, and how you checked
   it.

Keep a pull request to one change, and include before and after screenshots for anything
visible. CI runs `check` and `lint` on every pull request.

## Licence

By contributing, you agree that your work is released under the [MIT licence](LICENSE).
