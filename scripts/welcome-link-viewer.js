/**
 * welcome-link-viewer.js
 * Lightweight ApplicationV2 that displays the welcome page URL
 * and lets the GM copy it to the clipboard. Opened from module settings.
 */

import { getWelcomeUrl } from "./welcome-url.js";

export class WelcomeLinkViewer extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: "custom-login-welcome-link-viewer",
    classes: ["custom-login", "welcome-link-viewer"],
    window: {
      title: "Welcome Page Link",
      resizable: false,
      minimizable: false
    },
    position: {
      width: 560,
      height: "auto"
    },
    actions: {
      copyLink: WelcomeLinkViewer.#onCopyLink
    }
  };

  /** @override */
  static PARTS = {
    content: {
      template: "modules/custom-login/templates/welcome-link.hbs"
    }
  };

  /** @override */
  async _prepareContext(options) {
    return { welcomeUrl: getWelcomeUrl() };
  }

  /**
   * Copies the welcome page URL to the clipboard.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onCopyLink(event, target) {
    const url = target.closest(".cl-url-row")?.querySelector(".cl-url-display")?.textContent?.trim();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      ui.notifications.info("Link copied to clipboard.");
    } catch {
      ui.notifications.warn("Could not copy to clipboard automatically.");
    }
  }
}
