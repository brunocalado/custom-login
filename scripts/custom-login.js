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

const MODULE_ID = "custom-login";

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
    name: "Welcome Page Appearance Settings",
    hint: "Internal storage for the welcome page visual settings.",
    scope: "world",
    config: false,
    type: Object,
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
    name: "Welcome Page Sound Settings",
    hint: "Internal storage for hover and join audio cues.",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  registerInvitationLinksHook();
});

export { generateWelcomePage };
