# 0.3.2

- [Changed] Summoning Circle — replaced procedurally generated mandala SVGs with a curated library of 30 arcane/mystical symbols (runes, alchemical glyphs, elder signs, and more); each symbol is rendered in the player's color.
- [Changed] Summoning Circle — symbol assignment is now non-repeating: a globally shuffled pool guarantees every player gets a unique symbol until all 30 are exhausted, then wraps. Assignment is stable across page loads (hash-sorted by userId).
- [Changed] Summoning Circle — center login button cursor changed from `crosshair` to `pointer` when the button is active.
- [Changed] Summoning Circle — animated dashed connector line now travels from the player orb toward the center (was center toward orb).
- [Changed] README updated: added Summoning Circle to the layouts table, added `preview-summon.webp` screenshot, replaced local patch guide link with the EN and PT-BR wiki pages, added emojis.

# 0.3.1

- [Added] Summoning Circle layout — decorative magic circle with player orbs positioned in a ring; features deterministic mandala symbols (generated uniquely per player), animated starfield background, and two-step login: click orb to select + click center to enter (or press Escape to deselect).
- [Changed] Summoning Circle and Solar System layouts are now marked as self-contained; the Appearance Editor prevents setting custom backgrounds for both, and the generator forces `backgroundUrl: ""` to preserve their built-in animated effects.
- [Changed] Appearance Editor background section hint updated to reflect both self-contained layouts.

# 0.3.0

- [Added] `AppearanceSettingsModel` and `SoundSettingsModel` — `foundry.abstract.DataModel` with typed `foundry.data.fields` replacing raw `Object` settings; field types and defaults are now centralised and validated automatically.
- [Fixed] Solar System layout no longer allows setting a custom background in the Appearance Editor; the editor shows a note explaining the layout has a built-in starfield. The generator also forces `backgroundUrl: ""` for this template regardless of stored settings, so the canvas animation is never suppressed.
- [Changed] Solar System planets now render with a 3D sphere effect: specular highlight via `::after` radial gradient, stronger directional inset shadow, and a preserved depth shadow on hover.
- [Fixed] "Use Template Default" (clear background) now works correctly for all templates; a regression introduced by the DataModel migration caused the world background to be re-applied instead of clearing.
- [Added] `docs/SetupFoundryVTT.md` — full setup guide for Foundry VTT 14.361+ HTML hosting restriction, including step-by-step instructions for the patch scripts in `patch-foundry/`.
- [Changed] `templates/welcome-link.hbs` — added a succinct notice about the Foundry 14.361+ HTML restriction and how to apply the patch.

# 0.2.0

- https://github.com/brunocalado/custom-login/issues/1

# 0.1.9

- [Fixed] "Show on Screen" toggle now correctly hides users from the welcome page; disabled users were being re-added by the fallback loop in `welcome-generator.js`.
