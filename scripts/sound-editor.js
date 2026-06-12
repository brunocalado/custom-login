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

  /**
   * Builds the template context from the SoundSettingsModel instance.
   * DataModel guarantees all fields and their defaults, so no fallbacks needed.
   * @override
   * @returns {Promise<object>}
   */
  async _prepareContext(options) {
    const s = game.settings.get(MODULE_ID, "soundSettings");
    return {
      hoverSound:        s.hoverSound,
      joinSound:         s.joinSound,
      hoverSoundEnabled: s.hoverSoundEnabled,
      joinSoundEnabled:  s.joinSoundEnabled
    };
  }

  /**
   * Opens FilePicker to choose the global hover sound for the welcome page.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onPickHoverSound(event, target) {
    await SoundEditor.#flushFormToSettings(this.element);
    const s   = game.settings.get(MODULE_ID, "soundSettings");
    const app = this;
    new (FP())({
      type: "audio",
      current: s.hoverSound || DEFAULT_HOVER,
      callback: async (path) => {
        const cur = game.settings.get(MODULE_ID, "soundSettings").toObject();
        cur.hoverSound = path;
        await game.settings.set(MODULE_ID, "soundSettings", cur);
        app.render();
      }
    }).browse();
  }

  /**
   * Opens FilePicker to choose the global join (click) sound for the welcome page.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onPickJoinSound(event, target) {
    await SoundEditor.#flushFormToSettings(this.element);
    const s   = game.settings.get(MODULE_ID, "soundSettings");
    const app = this;
    new (FP())({
      type: "audio",
      current: s.joinSound || DEFAULT_JOIN,
      callback: async (path) => {
        const cur = game.settings.get(MODULE_ID, "soundSettings").toObject();
        cur.joinSound = path;
        await game.settings.set(MODULE_ID, "soundSettings", cur);
        app.render();
      }
    }).browse();
  }

  /**
   * Persists sound settings and regenerates welcome.json, then closes the editor.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
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

  /**
   * AppV2 form submit handler — persists form state to settings.
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   * @param {object} updateData
   */
  static async #onSubmit(event, form, formData, updateData) {
    await SoundEditor.#flushFormToSettings(form);
  }

  /**
   * Reads all sound fields from the DOM and writes them as a fresh plain
   * object to settings so the DataModel validates a complete, consistent state.
   * @param {HTMLElement} container
   * @returns {Promise<void>}
   */
  static async #flushFormToSettings(container) {
    await game.settings.set(MODULE_ID, "soundSettings", {
      hoverSound:        container.querySelector(".cl-hover-sound-url")?.value               ?? DEFAULT_HOVER,
      joinSound:         container.querySelector(".cl-join-sound-url")?.value                ?? DEFAULT_JOIN,
      hoverSoundEnabled: container.querySelector("input[name='hoverSoundEnabled']")?.checked ?? true,
      joinSoundEnabled:  container.querySelector("input[name='joinSoundEnabled']")?.checked  ?? true
    });
  }
}
