/**
 * welcome-editor.js
 * ApplicationV2 (HandlebarsApplicationMixin) that lets the GM
 * configure the welcome page: assign images to users, then
 * save to generate storage/welcome.json.
 */

import { generateWelcomePage } from "./welcome-generator.js";

const MODULE_ID = "custom-login";

/** V13-correct reference to the FilePicker implementation. */
const FP = () => foundry.applications.apps.FilePicker.implementation;

/* -------------------------------------------------- */
/*  Application                                        */
/* -------------------------------------------------- */

export class WelcomeEditor extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: "custom-login-welcome-editor",
    tag: "form",
    classes: ["custom-login", "welcome-editor"],
    window: {
      title: "Welcome Page Editor",
      resizable: true,
      minimizable: true
    },
    position: {
      width: 1100,
      height: "auto"
    },
    form: {
      handler: WelcomeEditor.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: false
    },
    actions: {
      pickImage:         WelcomeEditor.#onPickImage,
      pickUserHoverSound: WelcomeEditor.#onPickUserHoverSound,
      pickUserJoinSound:  WelcomeEditor.#onPickUserJoinSound,
      generatePage:      WelcomeEditor.#onGeneratePage
    }
  };

  /** @override */
  static PARTS = {
    form: {
      template: "modules/custom-login/templates/welcome-editor.hbs"
    }
  };

  /* ------------------------------------------------ */
  /*  Context                                          */
  /* ------------------------------------------------ */

  /** @override */
  async _prepareContext(options) {
    const saved = game.settings.get(MODULE_ID, "welcomeEntries") ?? [];
    const imageMap      = Object.fromEntries(saved.map(e => [e.userId, e.imageUrl       ?? ""]));
    const pwMap         = Object.fromEntries(saved.map(e => [e.userId, !!e.requirePassword]));
    const enabledMap    = Object.fromEntries(saved.map(e => [e.userId, e.enabled !== false]));
    const showNameMap   = Object.fromEntries(saved.map(e => [e.userId, e.showName       ?? "user"]));
    const hoverSoundMap = Object.fromEntries(saved.map(e => [e.userId, e.hoverSound     ?? ""]));
    const joinSoundMap  = Object.fromEntries(saved.map(e => [e.userId, e.joinSound      ?? ""]));

    // Build entries in saved order; new users (not yet in settings) appended at end.
    const savedUserIds = saved.map(e => e.userId);
    const orderedUsers = [
      ...saved.map(e => game.users.get(e.userId)).filter(Boolean),
      ...game.users.contents.filter(u => !savedUserIds.includes(u.id))
    ];
    const entries = orderedUsers.map(u => ({
      userId:          u.id,
      userName:        u.name,
      imageUrl:        imageMap[u.id]      ?? "",
      hasImage:        !!(imageMap[u.id]),
      requirePassword: pwMap[u.id]         ?? false,
      showOnScreen:    enabledMap[u.id]    ?? true,
      showName:        showNameMap[u.id]   ?? "user",
      hoverSound:      hoverSoundMap[u.id] ?? "",
      joinSound:       joinSoundMap[u.id]  ?? ""
    }));

    return { entries };
  }

  /* ------------------------------------------------ */
  /*  Lifecycle                                        */
  /* ------------------------------------------------ */

  /**
   * Wires up native HTML5 drag-and-drop reordering on the entries list.
   * Fires after each render so the listeners are always fresh.
   * @override
   * @param {object} context
   * @param {object} options
   */
  _onRender(context, options) {
    const list = this.element.querySelector(".cl-entries");
    if (!list) return;

    let dragged = null;

    list.addEventListener("dragstart", (e) => {
      const handle = e.target.closest(".cl-drag-handle");
      if (!handle) return;
      dragged = handle.closest(".cl-entry-row");
      dragged?.classList.add("cl-dragging");
    });

    list.addEventListener("dragend", () => {
      dragged?.classList.remove("cl-dragging");
      list.querySelectorAll(".cl-drag-over").forEach(r => r.classList.remove("cl-drag-over"));
      dragged = null;
    });

    list.addEventListener("dragover", (e) => {
      e.preventDefault();
      const over = e.target.closest(".cl-entry-row");
      if (!over || over === dragged) return;
      list.querySelectorAll(".cl-drag-over").forEach(r => r.classList.remove("cl-drag-over"));
      over.classList.add("cl-drag-over");
    });

    list.addEventListener("drop", async (e) => {
      e.preventDefault();
      const over = e.target.closest(".cl-entry-row");
      if (!over || over === dragged || !dragged) return;
      const rect = over.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        list.insertBefore(dragged, over);
      } else {
        list.insertBefore(dragged, over.nextSibling);
      }
      over.classList.remove("cl-drag-over");
      await WelcomeEditor.#flushFormToSettings(this.element);
    });
  }

  /* ------------------------------------------------ */
  /*  Static Action Handlers                           */
  /* ------------------------------------------------ */

  /**
   * Opens Foundry's FilePicker to choose an image for a user.
   * Flushes live form state first so no other edits are lost.
   */
  static async #onPickImage(event, target) {
    const userId = target.dataset.userId;
    await WelcomeEditor.#flushFormToSettings(this.element);

    const saved = game.settings.get(MODULE_ID, "welcomeEntries") ?? [];
    const current = saved.find(e => e.userId === userId)?.imageUrl ?? "";
    const app = this;

    new (FP())({
      type: "image",
      current,
      callback: async (path) => {
        const entries = game.settings.get(MODULE_ID, "welcomeEntries") ?? [];
        const existing = entries.find(e => e.userId === userId);
        if (existing) {
          existing.imageUrl = path;
        } else {
          entries.push({ userId, imageUrl: path });
        }
        await game.settings.set(MODULE_ID, "welcomeEntries", entries);
        app.render();
      }
    }).browse();
  }

  /**
   * Opens FilePicker to choose a per-user hover sound.
   * Saving with no file clears the custom sound (falls back to global).
   */
  static async #onPickUserHoverSound(event, target) {
    const userId = target.dataset.userId;
    await WelcomeEditor.#flushFormToSettings(this.element);

    const saved = game.settings.get(MODULE_ID, "welcomeEntries") ?? [];
    const current = saved.find(e => e.userId === userId)?.hoverSound ?? "";
    const app = this;

    new (FP())({
      type: "audio",
      current,
      callback: async (path) => {
        const entries = game.settings.get(MODULE_ID, "welcomeEntries") ?? [];
        const existing = entries.find(e => e.userId === userId);
        // An empty path (user confirmed with nothing selected) clears the override.
        const value = path?.trim() ?? "";
        if (existing) {
          existing.hoverSound = value;
        } else {
          entries.push({ userId, hoverSound: value });
        }
        await game.settings.set(MODULE_ID, "welcomeEntries", entries);
        app.render();
      }
    }).browse();
  }

  /**
   * Opens FilePicker to choose a per-user join sound.
   * Saving with no file clears the custom sound (falls back to global).
   */
  static async #onPickUserJoinSound(event, target) {
    const userId = target.dataset.userId;
    await WelcomeEditor.#flushFormToSettings(this.element);

    const saved = game.settings.get(MODULE_ID, "welcomeEntries") ?? [];
    const current = saved.find(e => e.userId === userId)?.joinSound ?? "";
    const app = this;

    new (FP())({
      type: "audio",
      current,
      callback: async (path) => {
        const entries = game.settings.get(MODULE_ID, "welcomeEntries") ?? [];
        const existing = entries.find(e => e.userId === userId);
        const value = path?.trim() ?? "";
        if (existing) {
          existing.joinSound = value;
        } else {
          entries.push({ userId, joinSound: value });
        }
        await game.settings.set(MODULE_ID, "welcomeEntries", entries);
        app.render();
      }
    }).browse();
  }

  /**
   * Saves all image assignments and generates welcome.json.
   */
  static async #onGeneratePage(event, target) {
    await WelcomeEditor.#flushFormToSettings(this.element);
    const entries = game.settings.get(MODULE_ID, "welcomeEntries") ?? [];

    try {
      await generateWelcomePage(entries);
      this.close();
    } catch (err) {
      console.error("custom-login | Failed to generate welcome page:", err);
      ui.notifications.error("Failed to save welcome page data.");
    }
  }

  /* ------------------------------------------------ */
  /*  Form Submit Handler                              */
  /* ------------------------------------------------ */

  static async #onSubmit(event, form, formData, updateData) {
    await WelcomeEditor.#flushFormToSettings(form);
  }

  /* ------------------------------------------------ */
  /*  Private Helpers                                  */
  /* ------------------------------------------------ */

  /**
   * Reads each entry row's inputs and writes to settings.
   */
  static async #flushFormToSettings(container) {
    const rows = container.querySelectorAll(".cl-entry-row");
    const entries = [];
    for (const row of rows) {
      const userId          = row.dataset.userId;
      const imageUrl        = row.querySelector(".cl-image-url")?.value           ?? "";
      const requirePassword = row.querySelector(".cl-require-password")?.checked  ?? false;
      const enabled         = row.querySelector(".cl-show-on-screen")?.checked    ?? true;
      const showName        = row.querySelector(".cl-show-name-select")?.value    ?? "user";
      const hoverSound      = row.querySelector(".cl-user-hover-sound")?.value    ?? "";
      const joinSound       = row.querySelector(".cl-user-join-sound")?.value     ?? "";
      if (userId) entries.push({ userId, imageUrl, requirePassword, enabled, showName, hoverSound, joinSound });
    }
    await game.settings.set(MODULE_ID, "welcomeEntries", entries);
  }
}
