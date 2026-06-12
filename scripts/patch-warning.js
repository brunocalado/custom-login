/**
 * patch-warning.js
 * Detects whether Foundry VTT's HTML hosting patch has been applied and
 * shows a warning dialog to GMs if it has not. Called once on "ready".
 */

const MODULE_ID = "custom-login";

/**
 * Returns true if Foundry serves module HTML files as text/html.
 * Uses a HEAD request to avoid downloading the file body.
 * If the patch is missing, Foundry returns text/plain and the welcome
 * screens will not render.
 * @returns {Promise<boolean>}
 */
async function isHtmlHostingEnabled() {
  const url = foundry.utils.getRoute("modules/custom-login/assets/screens/index.html");
  try {
    const res = await fetch(url, { method: "HEAD" });
    return (res.headers.get("content-type") ?? "").includes("text/html");
  } catch {
    return false;
  }
}

export class PatchWarning extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  /** @override */
  static DEFAULT_OPTIONS = {
    id: "custom-login-patch-warning",
    classes: ["custom-login", "patch-warning"],
    window: {
      title: "Custom Login — Action Required",
      resizable: false,
      minimizable: false
    },
    position: {
      width: 520,
      height: "auto"
    }
  };

  /** @override */
  static PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/patch-warning.hbs`
    }
  };
}

/**
 * Registers the "ready" hook that runs the HTML hosting check.
 * Only shows the warning to GMs; silently skips for players.
 * Called once during module init.
 * @returns {void}
 */
export function registerPatchCheck() {
  Hooks.once("ready", async () => {
    if (!game.user.isGM) return;
    if (await isHtmlHostingEnabled()) return;
    new PatchWarning().render(true);
  });
}
