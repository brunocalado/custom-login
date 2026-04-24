/**
 * invitation-links.js
 * Injects a "Custom Login" row into Foundry's core Invitation Links
 * dialog so GMs can grab the portrait-login URL from the same place
 * they share other game URLs. The Invitation Links dialog is GM-only,
 * so no additional permission guard is needed.
 */

import { getWelcomeUrl } from "./welcome-url.js";

const INJECTED_ROW_ID = "custom-login-invitation-row";

export function registerInvitationLinksHook() {
  Hooks.on("renderInvitationLinks", onRenderInvitationLinks);
}

function onRenderInvitationLinks(app, element) {
  const root = element instanceof HTMLElement ? element : element?.[0] ?? null;
  if (!root) return;
  if (root.querySelector(`#${INJECTED_ROW_ID}`)) return;

  injectRow(root);
}

function injectRow(root) {
  const url = getWelcomeUrl();

  const anchor =
    root.querySelector(".window-content form") ||
    root.querySelector(".window-content") ||
    root;

  const row = document.createElement("div");
  row.className = "form-group";
  row.id = INJECTED_ROW_ID;
  row.innerHTML = `
    <label>Custom Login</label>
    <div class="form-fields">
      <input type="text" readonly value="${foundry.utils.escapeHTML(url)}" />
      <button type="button" class="custom-login-copy" data-tooltip="Copy"
              aria-label="Copy Custom Login link">
        <i class="fas fa-copy"></i>
      </button>
    </div>
    <p class="hint">Shareable link to the character-portrait login page.</p>
  `;

  anchor.prepend(row);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      ui.notifications.info("Link copied to clipboard.");
    } catch {
      ui.notifications.warn("Could not copy to clipboard automatically.");
    }
  }

  row.querySelector(".custom-login-copy")?.addEventListener("click", (ev) => {
    ev.preventDefault();
    copyUrl();
  });

  row.querySelector("input")?.addEventListener("click", () => copyUrl());
}
