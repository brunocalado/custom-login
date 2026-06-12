/**
 * appearance-editor.js
 * ApplicationV2 that lets the GM configure the visual appearance of the
 * welcome page: background image/video and footer text.
 */

import { generateWelcomePage, normalizeTemplate } from "./welcome-generator.js";
import { getWelcomeUrl } from "./welcome-url.js";

const MODULE_ID = "custom-login";
const FP = () => foundry.applications.apps.FilePicker.implementation;
const DEFAULT_FAVICON = "modules/custom-login/assets/screens/favicon.ico";

function isVideoPath(url) {
  return /\.(mp4|webm|ogv|m4v)(\?.*)?$/i.test(url ?? "");
}

export class AppearanceEditor extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    id: "custom-login-appearance-editor",
    tag: "form",
    classes: ["custom-login", "appearance-editor"],
    window: {
      title: "Welcome Page Appearance",
      resizable: false,
      minimizable: true
    },
    position: {
      width: 520,
      height: "auto"
    },
    form: {
      handler: AppearanceEditor.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: false
    },
    actions: {
      pickBackground: AppearanceEditor.#onPickBackground,
      useWorldBackground: AppearanceEditor.#onUseWorldBackground,
      clearBackground: AppearanceEditor.#onClearBackground,
      generatePage: AppearanceEditor.#onGeneratePage,
      previewPage: AppearanceEditor.#onPreviewPage,
      pickFavicon: AppearanceEditor.#onPickFavicon,
      switchTab: AppearanceEditor.#onSwitchTab
    }
  };

  static PARTS = {
    form: {
      template: "modules/custom-login/templates/appearance-editor.hbs"
    }
  };

  /**
   * Builds the template context from the AppearanceSettingsModel instance.
   * Uses `||` instead of `??` for backgroundUrl so an unset (empty-string)
   * value still falls back to the world background.
   * @override
   * @returns {Promise<object>}
   */
  async _prepareContext(options) {
    const settings = game.settings.get(MODULE_ID, "appearanceSettings");
    const worldBg = game.world.background ?? "";
    const backgroundUrl = settings.backgroundUrl || worldBg;
    const template = normalizeTemplate(settings.template);
    return {
      backgroundUrl,
      template,
      worldBg,
      isVideo: isVideoPath(backgroundUrl),
      hasBackground: !!backgroundUrl,
      faviconUrl: settings.faviconUrl,
      screenTitle: settings.screenTitle,
      videoAudio: settings.videoAudio
    };
  }

  /**
   * Switches the visible tab panel inside the editor.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static #onSwitchTab(event, target) {
    const tab = target.dataset.tab;
    const wrap = target.closest(".cl-editor-wrap");
    wrap.querySelectorAll(".cl-tab-btn").forEach(btn =>
      btn.classList.toggle("cl-tab-btn--active", btn.dataset.tab === tab)
    );
    wrap.querySelectorAll(".cl-tab-panel").forEach(panel =>
      panel.classList.toggle("cl-tab-panel--hidden", panel.dataset.tabPanel !== tab)
    );
  }

  /**
   * Opens FilePicker for the welcome page background (image or video).
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onPickBackground(event, target) {
    await AppearanceEditor.#flushFormToSettings(this.element);
    const settings = game.settings.get(MODULE_ID, "appearanceSettings");
    const app = this;

    new (FP())({
      type: "imagevideo",
      current: settings.backgroundUrl || game.world.background || "",
      callback: async (path) => {
        const s = game.settings.get(MODULE_ID, "appearanceSettings").toObject();
        s.backgroundUrl = path;
        await game.settings.set(MODULE_ID, "appearanceSettings", s);
        app.render();
      }
    }).browse();
  }

  /**
   * Opens FilePicker for the welcome page favicon (.ico or image).
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onPickFavicon(event, target) {
    await AppearanceEditor.#flushFormToSettings(this.element);
    const settings = game.settings.get(MODULE_ID, "appearanceSettings");
    const app = this;

    new (FP())({
      type: "image",
      current: settings.faviconUrl || DEFAULT_FAVICON,
      callback: async (path) => {
        const s = game.settings.get(MODULE_ID, "appearanceSettings").toObject();
        s.faviconUrl = path;
        await game.settings.set(MODULE_ID, "appearanceSettings", s);
        app.render();
      }
    }).browse();
  }

  /**
   * Sets the background to the world's configured background image/video.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onUseWorldBackground(event, target) {
    await AppearanceEditor.#flushFormToSettings(this.element);
    const s = game.settings.get(MODULE_ID, "appearanceSettings").toObject();
    s.backgroundUrl = game.world.background ?? "";
    await game.settings.set(MODULE_ID, "appearanceSettings", s);
    this.render();
  }

  /**
   * Clears the welcome page background so it falls back to the world default.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onClearBackground(event, target) {
    await AppearanceEditor.#flushFormToSettings(this.element);
    const s = game.settings.get(MODULE_ID, "appearanceSettings").toObject();
    s.backgroundUrl = "";
    await game.settings.set(MODULE_ID, "appearanceSettings", s);
    this.render();
  }

  /**
   * Flushes form state, generates welcome.json, and closes the editor.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onGeneratePage(event, target) {
    await AppearanceEditor.#flushFormToSettings(this.element);
    const entries = game.settings.get(MODULE_ID, "welcomeEntries") ?? [];
    if (!entries.length) {
      ui.notifications.warn("Add at least one image entry in the Welcome Editor first.");
      return;
    }
    try {
      await generateWelcomePage(entries);
      this.close();
    } catch (err) {
      console.error("custom-login | Failed to generate welcome page:", err);
      ui.notifications.error("Failed to generate welcome page.");
    }
  }

  /**
   * Opens the generated welcome page in a new browser tab.
   * Triggered by the "Preview" button action.
   */
  static #onPreviewPage() {
    window.open(getWelcomeUrl(), "_blank");
  }

  /**
   * AppV2 form submit handler — persists form state to settings.
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   * @param {object} updateData
   */
  static async #onSubmit(event, form, formData, updateData) {
    await AppearanceEditor.#flushFormToSettings(form);
  }

  /**
   * Reads all appearance fields from the DOM and writes them as a fresh
   * plain object to settings. Passing a full object (not a partial patch)
   * ensures the DataModel always validates a complete, consistent state.
   * @param {HTMLElement} container
   * @returns {Promise<void>}
   */
  static async #flushFormToSettings(container) {
    await game.settings.set(MODULE_ID, "appearanceSettings", {
      backgroundUrl: container.querySelector(".cl-bg-url")?.value             ?? "",
      template:      container.querySelector(".cl-template-select")?.value    ?? "carousel",
      faviconUrl:    container.querySelector(".cl-favicon-url")?.value        ?? DEFAULT_FAVICON,
      screenTitle:   container.querySelector(".cl-screen-title")?.value       ?? "Welcome",
      videoAudio:    container.querySelector(".cl-video-audio-toggle")?.checked ?? false
    });
  }
}
