// shared.js — functions common to all layouts

let _resolvedJsonPath = null;

/**
 * Resolves the per-world JSON path by querying /api/status for the active world ID.
 * Caches the result to avoid repeated fetches during a single page load.
 * Returns null if /api/status is unavailable or no world is active.
 * @returns {Promise<string|null>}
 */
async function resolveJsonPath() {
  if (_resolvedJsonPath) return _resolvedJsonPath;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch('/api/status', { cache: 'no-cache', signal: controller.signal });
    if (res.ok) {
      const status = await res.json();
      const worldId = status?.world;
      if (worldId) {
        _resolvedJsonPath = '/modules/custom-login/storage/welcome-' + worldId + '.json';
        return _resolvedJsonPath;
      }
    }
  } catch (e) {
    console.warn('custom-login | Could not read /api/status:', e);
  } finally {
    clearTimeout(timer);
  }
  return null;
}

/**
 * Posts login credentials to /join and redirects on success.
 * @param {string} userId
 * @param {string} [password]
 * @returns {Promise<void>}
 */
async function loginAs(userId, password = '') {
  try {
    const res = await fetch('/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', userid: userId, password }),
      credentials: 'same-origin'
    });
    const data = await res.json().catch(() => ({}));
    if (data.redirect) {
      window.location.href = data.redirect;
    } else if (res.ok) {
      window.location.href = '/game';
    } else {
      alert('Login failed: ' + (data.error || ('HTTP ' + res.status)));
    }
  } catch (err) {
    console.error('custom-login | login error:', err);
    alert('Login failed. See browser console for details.');
  }
}

/**
 * Ensures a URL is absolute (starts with / or http).
 * @param {string} url
 * @returns {string}
 */
function toAbsolute(url) {
  if (!url) return url;
  if (/^https?:\/\//.test(url) || url.startsWith('/')) return url;
  return '/' + url;
}

/**
 * Returns true if the URL points to a video file by extension.
 * @param {string} url
 * @returns {boolean}
 */
function isVideo(url) {
  return /\.(mp4|webm|ogv|m4v)(\?.*)?$/i.test(url ?? '');
}

/**
 * Mounts an invisible full-screen overlay that waits for the first user interaction
 * before unmuting the video, satisfying browser autoplay policies.
 * @param {HTMLVideoElement} video
 */
function mountAudioOverlay(video) {
  const overlay = document.createElement('div');
  overlay.id = 'cl-audio-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:transparent;cursor:default;';
  document.body.appendChild(overlay);
  function unlock() {
    video.muted = false;
    video.play().catch(() => { video.muted = true; });
    overlay.remove();
  }
  overlay.addEventListener('mousemove', unlock, { once: true });
  overlay.addEventListener('click', unlock, { once: true });
}

/**
 * Applies a background image or video to the body.
 * @param {string} url
 * @param {{ videoAudio?: boolean }} [options]
 */
function applyBackground(url, options) {
  if (!url) return;
  const abs = toAbsolute(url);
  if (isVideo(url)) {
    const video = document.createElement('video');
    video.className = 'cl-bg-video';
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    const src = document.createElement('source');
    src.src = abs;
    video.appendChild(src);
    document.body.prepend(video);
    if (options?.videoAudio) mountAudioOverlay(video);
  } else {
    document.body.style.backgroundImage = "url('" + abs.replace(/'/g, "\\'") + "')";
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center center';
  }
}

/**
 * Escapes a string for safe insertion into HTML.
 * @param {string} str
 * @returns {string}
 */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Returns the display name for a player entry (character name preferred over user name).
 * @param {{ characterName?: string, userName?: string }} entry
 * @returns {string}
 */
function displayName(entry) {
  return entry.characterName || entry.userName;
}

/**
 * Injects the password dialog into the body if not already present.
 * Called lazily so layouts that never need a password pay no cost.
 */
function injectPasswordDialog() {
  if (document.getElementById('cl-pw-dialog')) return;
  const dialog = document.createElement('div');
  dialog.id = 'cl-pw-dialog';
  dialog.setAttribute('hidden', '');
  dialog.innerHTML = `
    <div class="cl-pw-panel">
      <p class="cl-pw-label">Enter your password</p>
      <input type="password" id="cl-pw-input" class="cl-pw-input" placeholder="Password" autocomplete="current-password" />
      <div class="cl-pw-buttons">
        <button type="button" class="cl-pw-cancel">Cancel</button>
        <button type="button" class="cl-pw-submit">Continue</button>
      </div>
    </div>`;
  document.body.appendChild(dialog);
}

/**
 * Shows the password dialog and calls onConfirm with the entered password.
 * @param {function(string): void} onConfirm
 */
function showPasswordDialog(onConfirm) {
  injectPasswordDialog();
  const dialog = document.getElementById('cl-pw-dialog');
  const input = document.getElementById('cl-pw-input');
  const submitBtn = dialog.querySelector('.cl-pw-submit');
  const cancelBtn = dialog.querySelector('.cl-pw-cancel');

  input.value = '';
  dialog.removeAttribute('hidden');
  input.focus();

  function cleanup() {
    dialog.setAttribute('hidden', '');
    submitBtn.removeEventListener('click', handleSubmit);
    cancelBtn.removeEventListener('click', handleCancel);
    input.removeEventListener('keydown', handleKey);
  }
  function handleSubmit() { const pw = input.value; cleanup(); onConfirm(pw); }
  function handleCancel() { cleanup(); }
  function handleKey(e) {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') handleCancel();
  }

  submitBtn.addEventListener('click', handleSubmit);
  cancelBtn.addEventListener('click', handleCancel);
  input.addEventListener('keydown', handleKey);
}

let audioCtx = null;

/** @returns {AudioContext} */
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

/**
 * Plays a brief two-tone chime via Web Audio API. Silent on failure.
 */
function playHoverChime() {
  try {
    const ctx  = getAudioCtx();
    const now  = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    [[523.25, 0.10], [783.99, 0.06]].forEach(([freq, vol], i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.004, now + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(vol, now + 0.02 + i * 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      osc.connect(g);
      g.connect(gain);
      osc.start(now);
      osc.stop(now + 0.5);
    });
  } catch (e) {}
}

/**
 * Fetches no-world.html and injects it into the body, replacing the status spinner.
 * Falls back to plain text if the fetch fails.
 * @returns {Promise<void>}
 */
async function showNoWorldPage() {
  const statusEl = document.getElementById('cl-status');
  try {
    const res = await fetch('no-world.html', { cache: 'no-cache' });
    if (res.ok) {
      const html = await res.text();
      const container = document.createElement('div');
      container.innerHTML = html;
      document.body.appendChild(container);
      if (statusEl) statusEl.remove();
      return;
    }
  } catch (e) {
    console.warn('custom-login | Could not load no-world.html:', e);
  }
  if (statusEl) statusEl.textContent = 'No world is active. Ask your GM to start a session.';
}

/**
 * Injects shared CSS (password dialog, video background, status overlay, card shared styles)
 * into <head> once per page load. Called at the start of each layout's init().
 */
function injectSharedStyles() {
  if (document.getElementById('cl-shared-styles')) return;
  const style = document.createElement('style');
  style.id = 'cl-shared-styles';
  style.textContent = `
    .cl-bg-video {
      position: fixed; inset: 0; width: 100%; height: 100%;
      object-fit: cover; z-index: 0; pointer-events: none;
    }
    #cl-pw-dialog {
      position: fixed; inset: 0; z-index: 100;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.72);
    }
    #cl-pw-dialog[hidden] { display: none; }
    .cl-pw-panel {
      background: #1a1a2e; border: 1px solid rgba(255,255,255,0.12);
      border-radius: 0.75rem; padding: 1.75rem 2rem;
      display: flex; flex-direction: column; gap: 1rem;
      min-width: 280px; max-width: 360px; width: 90%;
      box-shadow: 0 8px 40px rgba(0,0,0,0.8);
    }
    .cl-pw-label { color: rgba(255,255,255,0.8); font-size: 0.95rem; text-align: center; }
    .cl-pw-input {
      background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.18);
      border-radius: 0.4rem; color: #fff; font-size: 1rem;
      padding: 0.5rem 0.75rem; outline: none; width: 100%;
    }
    .cl-pw-input:focus { border-color: rgba(255,255,255,0.4); }
    .cl-pw-buttons { display: flex; gap: 0.75rem; justify-content: flex-end; }
    .cl-pw-cancel, .cl-pw-submit {
      border: none; border-radius: 0.4rem; padding: 0.45rem 1.2rem;
      font-size: 0.9rem; cursor: pointer;
    }
    .cl-pw-cancel { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }
    .cl-pw-cancel:hover { background: rgba(255,255,255,0.18); }
    .cl-pw-submit { background: rgba(90,70,190,0.75); color: #fff; }
    .cl-pw-submit:hover { background: rgba(110,90,210,0.9); }
    #cl-status {
      position: fixed; inset: 0; display: flex; align-items: center;
      justify-content: center; font-size: 1rem;
      color: rgba(255,255,255,0.45); letter-spacing: 0.05em; z-index: 10;
    }
    .cl-card-placeholder {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      background: #1e1e2e;
      font-family: 'Cinzel', serif;
      font-size: clamp(0.8rem, 1.5vw, 1.1rem);
      color: rgba(255,255,255,0.5);
      text-align: center;
      padding: 1rem;
    }
    .cl-card-label {
      position: absolute; bottom: 0; left: 0; right: 0;
      padding: 2.5rem 0.6rem 0.65rem;
      background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%);
      font-family: 'Cinzel', serif;
      font-size: clamp(0.6rem, 0.9vw, 0.78rem);
      color: rgba(255,255,255,0.9);
      text-align: center;
      letter-spacing: 0.04em;
      text-shadow: 0 0 10px rgba(0,0,0,0.8);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      pointer-events: none;
      transition: opacity 200ms;
    }
  `;
  document.head.appendChild(style);
}
