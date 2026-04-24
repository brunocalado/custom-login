/**
 * sound-editor.js
 * ApplicationV2 that lets the GM configure the audio cues for the
 * welcome page: hover sound and join (click) sound.
 */

import { generateWelcomePage } from "./welcome-generator.js";

const MODULE_ID = "custom-login";
const FP = () => foundry.applications.apps.FilePicker.implementation;

const DEFAULT_HOVER = "modules/custom-login/assets/sfx/hover.mp3";
const DEFAULT_JOIN  = "modules/custom-login/assets/sfx/join.mp3";

export class SoundEditor extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "custom-login-sound-editor",
    tag: "form",
    classes: ["custom-login", "sound-editor"],
    window: {
      title: "Welcome Page Sound Settings",
      resizable: false,
      minimizable: true
    },
    position: {
      width: 480,
      height: "auto"
    },
    form: {
      handler: SoundEditor.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: false
    },
    actions: {
      pickHoverSound:  SoundEditor.#onPickHoverSound,
      pickJoinSound:   SoundEditor.#onPickJoinSound,
      saveAndGenerate: SoundEditor.#onSaveAndGenerate
    }
  };

  static PARTS = {
    form: { template: "modules/custom-login/templates/sound-editor.hbs" }
  };

  async _prepareContext(options) {
    const s = game.settings.get(MODULE_ID, "soundSettings") ?? {};
    return {
      hoverSound:        s.hoverSound        ?? DEFAULT_HOVER,
      joinSound:         s.joinSound         ?? DEFAULT_JOIN,
      hoverSoundEnabled: s.hoverSoundEnabled ?? true,
      joinSoundEnabled:  s.joinSoundEnabled  ?? true
    };
  }

  static async #onPickHoverSound(event, target) {
    await SoundEditor.#flushFormToSettings(this.element);
    const s   = game.settings.get(MODULE_ID, "soundSettings") ?? {};
    const app = this;
    new (FP())({
      type: "audio",
      current: s.hoverSound ?? DEFAULT_HOVER,
      callback: async (path) => {
        const cur = game.settings.get(MODULE_ID, "soundSettings") ?? {};
        cur.hoverSound = path;
        await game.settings.set(MODULE_ID, "soundSettings", cur);
        app.render();
      }
    }).browse();
  }

  static async #onPickJoinSound(event, target) {
    await SoundEditor.#flushFormToSettings(this.element);
    const s   = game.settings.get(MODULE_ID, "soundSettings") ?? {};
    const app = this;
    new (FP())({
      type: "audio",
      current: s.joinSound ?? DEFAULT_JOIN,
      callback: async (path) => {
        const cur = game.settings.get(MODULE_ID, "soundSettings") ?? {};
        cur.joinSound = path;
        await game.settings.set(MODULE_ID, "soundSettings", cur);
        app.render();
      }
    }).browse();
  }

  static async #onSaveAndGenerate(event, target) {
    await SoundEditor.#flushFormToSettings(this.element);
    const entries = game.settings.get(MODULE_ID, "welcomeEntries") ?? [];
    if (!entries.length) {
      ui.notifications.warn("Add at least one image entry in the Welcome Editor first.");
      return;
    }
    try {
      await generateWelcomePage(entries);
      this.close();
    } catch (err) {
      console.error("custom-login | Failed to save sound settings:", err);
      ui.notifications.error("Failed to regenerate welcome page.");
    }
  }

  static async #onSubmit(event, form, formData, updateData) {
    await SoundEditor.#flushFormToSettings(form);
  }

  static async #flushFormToSettings(container) {
    const hoverSound        = container.querySelector(".cl-hover-sound-url")?.value ?? DEFAULT_HOVER;
    const joinSound         = container.querySelector(".cl-join-sound-url")?.value  ?? DEFAULT_JOIN;
    const hoverSoundEnabled = container.querySelector("input[name='hoverSoundEnabled']")?.checked ?? true;
    const joinSoundEnabled  = container.querySelector("input[name='joinSoundEnabled']")?.checked  ?? true;
    const s = game.settings.get(MODULE_ID, "soundSettings") ?? {};
    s.hoverSound        = hoverSound;
    s.joinSound         = joinSound;
    s.hoverSoundEnabled = hoverSoundEnabled;
    s.joinSoundEnabled  = joinSoundEnabled;
    await game.settings.set(MODULE_ID, "soundSettings", s);
  }
}
