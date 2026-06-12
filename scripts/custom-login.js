/**
 * custom-login.js
 * Main entry point. Registers module settings and the settings menu
 * buttons that open the Welcome Page Editor and Appearance Editor.
 */

import { WelcomeLinkViewer } from "./welcome-link-viewer.js";
import { WelcomeEditor } from "./welcome-editor.js";
import { AppearanceEditor } from "./appearance-editor.js";
import { SoundEditor } from "./sound-editor.js";
import { generateWelcomePage } from "./welcome-generator.js";
import { registerInvitationLinksHook } from "./invitation-links.js";
import { registerPatchCheck } from "./patch-warning.js";

const MODULE_ID = "custom-login";

/**
 * DataModel for the welcome page visual settings (background, template,
 * favicon, title, video audio). Centralises field types and defaults so
 * scattered `?? ""` guards throughout editors are no longer needed.
 */
class AppearanceSettingsModel extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    const f = foundry.data.fields;
    return {
      backgroundUrl: new f.StringField({ blank: true, initial: "" }),
      template:      new f.StringField({ blank: false, initial: "carousel" }),
      faviconUrl:    new f.StringField({ blank: true, initial: "modules/custom-login/assets/screens/favicon.ico" }),
      screenTitle:   new f.StringField({ blank: true, initial: "Welcome" }),
      videoAudio:    new f.BooleanField({ initial: true })
    };
  }
}

/**
 * DataModel for the welcome page audio cues (hover / join sounds and their
 * enabled flags). Centralises field types and defaults.
 */
class SoundSettingsModel extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    const f = foundry.data.fields;
    return {
      hoverSound:        new f.StringField({ blank: true, initial: "modules/custom-login/assets/sfx/hover.mp3" }),
      joinSound:         new f.StringField({ blank: true, initial: "modules/custom-login/assets/sfx/join.mp3" }),
      hoverSoundEnabled: new f.BooleanField({ initial: true }),
      joinSoundEnabled:  new f.BooleanField({ initial: true })
    };
  }
}

Hooks.once("init", () => {
  game.settings.registerMenu(MODULE_ID, "welcomeLinkMenu", {
    name: "Welcome Page Link",
    label: "Copy Welcome Link",
    hint: "View and copy the direct URL to the custom welcome page.",
    icon: "fas fa-link",
    type: WelcomeLinkViewer,
    restricted: true
  });

  game.settings.registerMenu(MODULE_ID, "welcomeEditorMenu", {
    name: "Custom Login",
    label: "Open Welcome Editor",
    hint: "Configure which players can log in by clicking their portrait on the welcome page.",
    icon: "fas fa-image",
    type: WelcomeEditor,
    restricted: true
  });

  game.settings.registerMenu(MODULE_ID, "appearanceEditorMenu", {
    name: "Welcome Page Appearance",
    label: "Open Appearance Editor",
    hint: "Customize the background image or video and footer text of the welcome page.",
    icon: "fas fa-palette",
    type: AppearanceEditor,
    restricted: true
  });

  game.settings.register(MODULE_ID, "welcomeEntries", {
    name: "Welcome Page Entries",
    hint: "Internal storage for the welcome page image/user pairs.",
    scope: "world",
    config: false,
    type: Array,
    default: []
  });

  game.settings.register(MODULE_ID, "appearanceSettings", {
    scope: "world",
    config: false,
    type: AppearanceSettingsModel,
    default: {}
  });

  game.settings.registerMenu(MODULE_ID, "soundEditorMenu", {
    name: "Sound Settings",
    label: "Open Sound Settings",
    hint: "Configure the hover and join audio cues for the welcome page.",
    icon: "fas fa-music",
    type: SoundEditor,
    restricted: true
  });

  game.settings.register(MODULE_ID, "soundSettings", {
    scope: "world",
    config: false,
    type: SoundSettingsModel,
    default: {}
  });

  registerInvitationLinksHook();
  registerPatchCheck();
});

export { generateWelcomePage };
