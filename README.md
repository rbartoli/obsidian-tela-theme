<img src="assets/cover.webp" alt="Tela, an Obsidian theme that is easy to read and easy to scan: a reading note in dark mode, the Library's book covers in light mode, and the same note on phones in dark and light">

An Obsidian theme inspired by the style guide of the Tela app. It supports dark and light
mode, on desktop, phone and tablet.

## Screenshots

<table>
  <tr>
    <td width="50%"><img src="assets/notes-light.webp" alt="A reading note with properties, a quote and a callout, in light mode"><br>Notes and properties</td>
    <td width="50%"><img src="assets/bases-light.webp" alt="A base in cards view, showing four book covers, in light mode"><br>Bases cards</td>
  </tr>
  <tr>
    <td><img src="assets/headings-dark.webp" alt="Headings from H1 to H6, each over a paragraph, in dark mode"><br>Headings step down by colour and size</td>
    <td><img src="assets/headings-light.webp" alt="Headings from H1 to H6, each over a paragraph, in light mode"><br>The same steps in light mode</td>
  </tr>
  <tr>
    <td><img src="assets/tasks-dark.webp" alt="Task markers, each with its own mark, in dark mode"><br>Twenty task marks</td>
    <td><img src="assets/code-dark.webp" alt="Code blocks in JavaScript, CSS, HTML and Python, in dark mode"><br>Code in Tela's terminal colours</td>
  </tr>
</table>

<table>
  <tr>
    <td width="33%"><img src="assets/phone-notes-dark.webp" alt="The reading note on a phone, in dark mode"></td>
    <td width="33%"><img src="assets/phone-notes-light.webp" alt="The reading note on a phone, in light mode"></td>
    <td width="33%"><img src="assets/phone-bases-dark.webp" alt="The base's book covers on a phone, in dark mode"></td>
  </tr>
</table>

## Why Tela

- **Easy to read, easy to scan.** Before each release, an
  [automated contrast audit](CONTRIBUTING.md#qa) checks more than 390 screens of notes,
  Canvas, Bases, search, menus and settings, in dark and light mode, on desktop, phone and
  tablet. With the theme's blue accent, every text colour clears WCAG AA (4.5:1). The
  audit doesn't judge text on images, or plugins beyond those under Compatibility.
  Headings step down by colour as well as size.
- **Ready as installed.** One quiet surface for sidebars, tabs and notes, hairline
  borders, and nothing to set up.
- **Built to survive Obsidian updates.** The theme works through Obsidian's own variables
  rather than fragile selectors, and a [weekly check](CONTRIBUTING.md#obsidian-updates)
  tests each new Obsidian release for changes that would break it.

## Features

- Dark and light palettes taken from the Tela app, with its blue accent. Your own accent
  colour in Settings → Appearance still applies, but the audit covers only the blue: some
  accents, such as navy in dark mode or yellow in light, make accent text hard to read.
- The open note, settings page and sidebar view are marked in the accent. Hover stays
  grey, so a row you point at never looks selected.
- Callouts sit on a faint card with a rounded bar in their colour; quotes take the same
  bar in grey.
- Code blocks in the colours of Tela's terminal, every one readable on the code
  background.
- Tasks with their own marks for important `[!]`, question `[?]`, cancelled `[-]` and in
  progress `[/]`.
- Headings at one weight in a gentle size scale. H1 and H2 take the accent, with a
  hairline under them; H3 mixes the accent into body ink; the two smallest levels stay muted.
- Unresolved links keep full colour, with a dashed underline instead of fading.
- Phone and tablet keep the desktop palette rather than switching to pure black.
- Printing and PDF export keep callouts, code blocks, tables and images on one page, and
  each heading on the page of the text it introduces.

## Settings

With the [Style Settings](https://github.com/obsidian-community/obsidian-style-settings)
plugin, the theme has three options, all off by default:

- **Distinct sidebars** gives the sidebars a recessed surface of their own.
- **Dim images in dark mode** shows images in notes at 70% until you hover them, so a
  white screenshot doesn't glare off the dark page. Phones and tablets have no hover, so
  there images stay dimmed.
- **Tinted italics** gives italics the same hint of accent as bold, so they stand apart
  from body text by colour as well as slant.

## Fonts

The theme sets Inter, which Obsidian ships with, for the interface and notes, and your
system's monospace font for code. Your choices in Settings → Appearance → Font always win
over the theme's.

## Compatibility

Obsidian 1.13.4 or later, on desktop and mobile. Checked with the Dataview, Tasks, Kanban,
Excalidraw, Iconize and Notebook Navigator plugins, and with right-to-left text. File-tree
icons are left to a plugin such as Iconize.

## Verifying a release

Each release's `theme.css` and `manifest.json` carry signed build provenance. To check
that a downloaded `theme.css` was built by this repository's release workflow:

```sh
gh attestation verify theme.css -R rbartoli/obsidian-tela-theme
```

## Licence

[MIT](LICENSE)
