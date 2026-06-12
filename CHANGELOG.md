# 0.3.0

- [Added] `AppearanceSettingsModel` and `SoundSettingsModel` — `foundry.abstract.DataModel` with typed `foundry.data.fields` replacing raw `Object` settings; field types and defaults are now centralised and validated automatically.
- [Fixed] Solar System layout no longer allows setting a custom background in the Appearance Editor; the editor shows a note explaining the layout has a built-in starfield. The generator also forces `backgroundUrl: ""` for this template regardless of stored settings, so the canvas animation is never suppressed.
- [Fixed] "Use Template Default" (clear background) now works correctly for all templates; a regression introduced by the DataModel migration caused the world background to be re-applied instead of clearing.
- [Added] `docs/SetupFoundryVTT.md` — full setup guide for Foundry VTT 14.361+ HTML hosting restriction, including step-by-step instructions for the patch scripts in `patch-foundry/`.
- [Changed] `templates/welcome-link.hbs` — added a succinct notice about the Foundry 14.361+ HTML restriction and how to apply the patch.

# 0.2.0

- https://github.com/brunocalado/custom-login/issues/1

# 0.1.9

- [Fixed] "Show on Screen" toggle now correctly hides users from the welcome page; disabled users were being re-added by the fallback loop in `welcome-generator.js`.
