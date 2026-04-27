/**
 * welcome-generator.js
 * Serialises welcome page data to welcome.json and writes it to the
 * module's persistent storage folder via Foundry's file API.
 *
 * JSON shape:
 *   {
 *     entries:    [{ imageUrl, userId, userName, showName }],
 *     appearance: { backgroundUrl, template, faviconUrl, screenTitle },
 *     sounds:     { hoverSound, joinSound, hoverSoundEnabled, joinSoundEnabled }
 *   }
 */

const MODULE_ID = "custom-login";
const STORAGE_PATH = `modules/${MODULE_ID}/storage`;

/**
 * Returns the per-world JSON filename using the world ID so each world has
 * its own isolated file instead of a shared welcome.json.
 * @param {string} worldId
 * @returns {string}
 */
function getFileName(worldId) {
  return `welcome-${worldId}.json`;
}

const FP = () => foundry.applications.apps.FilePicker.implementation;

/**
 * Normalises legacy template filename values to the short keys used
 * internally and in welcome.json. Centralised here so both the generator
 * and the appearance editor read from the same logic.
 * @param {string} value
 * @returns {string}
 */
export function normalizeTemplate(value) {
  let t = value ?? "carousel";
  if (t === "welcome.html" || t === "welcome-carousel.html") t = "carousel";
  if (t === "welcome-grid.html") t = "grid";
  if (t === "welcome-strips.html" || t === "strips") t = "row";
  return t;
}

/**
 * Serialises entries + appearance settings to welcome.json and uploads
 * it to the module's persistent storage directory.
 *
 * @param {Array<{imageUrl: string, userId: string, showName?: string}>} entries
 * @returns {Promise<void>}
 */
export async function generateWelcomePage(entries) {
  const validEntries = (entries ?? []).filter(e => e.userId);
  const imageMap    = Object.fromEntries(validEntries.map(e => [e.userId, e.imageUrl    ?? ""]));
  const pwMap       = Object.fromEntries(validEntries.map(e => [e.userId, !!e.requirePassword]));
  const enabledMap  = Object.fromEntries(validEntries.map(e => [e.userId, e.enabled !== false]));
  const showNameMap = Object.fromEntries(validEntries.map(e => [e.userId, e.showName   ?? "user"]));

  const processedIds = new Set();
  const disabledIds  = new Set();
  const resolvedEntries = [];

  for (const e of validEntries) {
    if (enabledMap[e.userId] === false) {
      disabledIds.add(e.userId);
      continue;
    }
    const u = game.users.get(e.userId);
    if (!u) continue;
    resolvedEntries.push({
      imageUrl:        imageMap[e.userId]    ?? "",
      userId:          e.userId,
      userName:        u.name,
      characterName:   u.character?.name    ?? "",
      requirePassword: pwMap[e.userId]       ?? false,
      showName:        showNameMap[e.userId] ?? "user"
    });
    processedIds.add(e.userId);
  }

  for (const u of game.users.contents) {
    if (processedIds.has(u.id)) continue;
    if (disabledIds.has(u.id))  continue;
    resolvedEntries.push({
      imageUrl:        "",
      userId:          u.id,
      userName:        u.name,
      characterName:   u.character?.name ?? "",
      requirePassword: false,
      showName:        "user"
    });
  }

  if (!resolvedEntries.length) {
    throw new Error("No users found to generate the welcome page.");
  }

  const appearance = game.settings.get(MODULE_ID, "appearanceSettings") ?? {};
  const sounds     = game.settings.get(MODULE_ID, "soundSettings")       ?? {};
  const worldBg    = game.world.background ?? "";

  const template = normalizeTemplate(appearance.template);

  const data = {
    entries: resolvedEntries,
    appearance: {
      backgroundUrl: (appearance.backgroundUrl != null) ? appearance.backgroundUrl : worldBg,
      template,
      faviconUrl:    appearance.faviconUrl  || "modules/custom-login/assets/screens/favicon.ico",
      screenTitle:   appearance.screenTitle || "Welcome",
      videoAudio:    appearance.videoAudio  ?? false
    },
    sounds: {
      hoverSound:        sounds.hoverSound        || "modules/custom-login/assets/sfx/hover.mp3",
      joinSound:         sounds.joinSound         || "modules/custom-login/assets/sfx/join.mp3",
      hoverSoundEnabled: sounds.hoverSoundEnabled ?? true,
      joinSoundEnabled:  sounds.joinSoundEnabled  ?? true
    }
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const worldId  = game.world.id;
  const fileName = getFileName(worldId);
  const file     = new File([blob], fileName, { type: "application/json" });

  try {
    await FP().createDirectory("data", STORAGE_PATH);
  } catch (err) {
    if (!err.message?.includes("EEXIST") && !err.message?.includes("already exists")) {
      console.warn("custom-login | createDirectory warning:", err.message);
    }
  }

  const response = await FP().upload("data", STORAGE_PATH, file, {});
  if (!response?.path) {
    throw new Error(`Upload failed — no path returned. Response: ${JSON.stringify(response)}`);
  }

  console.log(`custom-login | ${fileName} saved to ${response.path}`);
}
