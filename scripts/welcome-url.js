/**
 * welcome-url.js
 * Shared helper that builds the absolute URL to the custom-login
 * welcome screen. Used by both the Welcome Editor and the
 * Invitation Links dialog integration so the URL is produced in
 * exactly one place.
 */

/**
 * Returns the absolute URL to the custom-login welcome screen.
 * Uses foundry.utils.getRoute() so the URL is correct even when Foundry
 * runs under a routePrefix (e.g. a reverse-proxy subpath like /foundry/).
 * @returns {string}
 */
export function getWelcomeUrl() {
  return `${window.location.origin}${foundry.utils.getRoute("modules/custom-login/assets/screens/index.html")}`;
}
