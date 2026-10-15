Before and after the Android date-input padding fix, using the `Date inputs.md`
fixture in Obsidian 1.14.4 / Tela 1.0.0, dark mode, at 390 × 844 CSS pixels.
Both captures use Electron with `is-android` applied to exercise Android's CSS.
The original bug was reported with a screenshot from a real phone.

`before.png` uses the released theme; `after.png` uses this branch's theme.
The native calendar icon overlaps both empty and filled fields before the fix.

Run the regression, including light mode and Android RTL:

```sh
npm run qa -- --obsidian 1.14.4 --no-plugins --scene date-inputs,date-inputs-android,date-inputs-android-rtl
```

The check measures native icon/text bounds through CDP, so this regression fails
even when every colour passes the contrast audit.
