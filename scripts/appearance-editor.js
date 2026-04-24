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

  async _prepareContext(options) {
    const settings = game.settings.get(MODULE_ID, "appearanceSettings") ?? {};
    const worldBg = game.world.background ?? "";
    const backgroundUrl = settings.backgroundUrl ?? worldBg;

    const template = normalizeTemplate(settings.template);

    return {
      backgroundUrl,
      template,
      worldBg,
      isVideo: isVideoPath(backgroundUrl),
      hasBackground: !!backgroundUrl,
      faviconUrl: settings.faviconUrl ?? DEFAULT_FAVICON,
      screenTitle: settings.screenTitle ?? "Welcome",
      videoAudio: settings.videoAudio ?? true
    };
  }

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

  static async #onPickBackground(event, target) {
    await AppearanceEditor.#flushFormToSettings(this.element);
    const settings = game.settings.get(MODULE_ID, "appearanceSettings") ?? {};
    const app = this;

    new (FP())({
      type: "imagevideo",
      current: settings.backgroundUrl ?? game.world.background ?? "",
      callback: async (path) => {
        const s = game.settings.get(MODULE_ID, "appearanceSettings") ?? {};
        s.backgroundUrl = path;
        await game.settings.set(MODULE_ID, "appearanceSettings", s);
        app.render();
      }
    }).browse();
  }

  static async #onPickFavicon(event, target) {
    await AppearanceEditor.#flushFormToSettings(this.element);
    const settings = game.settings.get(MODULE_ID, "appearanceSettings") ?? {};
    const app = this;

    new (FP())({
      type: "image",
      current: settings.faviconUrl ?? DEFAULT_FAVICON,
      callback: async (path) => {
        const s = game.settings.get(MODULE_ID, "appearanceSettings") ?? {};
        s.faviconUrl = path;
        await game.settings.set(MODULE_ID, "appearanceSettings", s);
        app.render();
      }
    }).browse();
  }

  static async #onUseWorldBackground(event, target) {
    await AppearanceEditor.#flushFormToSettings(this.element);
    const settings = game.settings.get(MODULE_ID, "appearanceSettings") ?? {};
    settings.backgroundUrl = game.world.background ?? "";
    await game.settings.set(MODULE_ID, "appearanceSettings", settings);
    this.render();
  }

  static async #onClearBackground(event, target) {
    await AppearanceEditor.#flushFormToSettings(this.element);
    const settings = game.settings.get(MODULE_ID, "appearanceSettings") ?? {};
    settings.backgroundUrl = "";
    await game.settings.set(MODULE_ID, "appearanceSettings", settings);
    this.render();
  }

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

  static async #onSubmit(event, form, formData, updateData) {
    await AppearanceEditor.#flushFormToSettings(form);
  }

  static async #flushFormToSettings(container) {
    const backgroundUrl = container.querySelector(".cl-bg-url")?.value        ?? "";
    const template      = container.querySelector(".cl-template-select")?.value ?? "carousel";
    const faviconUrl    = container.querySelector(".cl-favicon-url")?.value    ?? DEFAULT_FAVICON;
    const screenTitle   = container.querySelector(".cl-screen-title")?.value   ?? "Welcome";
    const videoAudio    = container.querySelector(".cl-video-audio-toggle")?.checked ?? false;
    const settings = game.settings.get(MODULE_ID, "appearanceSettings") ?? {};
    settings.backgroundUrl = backgroundUrl;
    settings.template      = template;
    settings.faviconUrl    = faviconUrl;
    settings.screenTitle   = screenTitle;
    settings.videoAudio    = videoAudio;
    await game.settings.set(MODULE_ID, "appearanceSettings", settings);
  }
}
