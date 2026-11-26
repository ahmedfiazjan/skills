const VISITOR_ID_KEY = 'rybbit-visitor-id';
const MODES = ['hybrid', 'daily', 'full'];

const DEFAULTS = {
  mode: 'hybrid',
  storageKey: 'rybbit-privacy-choice',
  replayBlockSelector: 'form',
  replayMaskTextSelectors: [],
  policyUrl: '/privacy',
  injectStyles: true,
  text: {
    title: 'Your privacy',
    body: 'This site counts visits to see how it is used. That count includes you whether you accept or not. Accept lets it also recognise your browser when you come back and record how you use the pages, with typed text hidden.',
    policy: 'Read the privacy policy.',
    accept: 'Accept',
    decline: 'Decline',
  },
};

const STYLES = `
:where(.rybbit-consent) { position: fixed; inset: auto 0 0 0; z-index: 2147483000; box-sizing: border-box; width: 100%; max-width: none; margin: 0; padding: 1rem 1.25rem; border: 0; border-top: 1px solid var(--rybbit-consent-border, #c8c8c8); background: var(--rybbit-consent-bg, #fff); color: var(--rybbit-consent-fg, #111); font: inherit; }
:where(.rybbit-consent h2) { margin: 0 0 0.25rem; font-size: 1.1rem; }
:where(.rybbit-consent p) { margin: 0; }
:where(.rybbit-consent-actions) { display: flex; gap: 0.75rem; margin-top: 0.75rem; }
:where(.rybbit-consent button) { padding: 0.5rem 1rem; border: 1px solid currentColor; border-radius: 0.25rem; background: transparent; color: inherit; font: inherit; cursor: pointer; }
`;

let instance;

function isSafePolicyUrl(url) {
  if (typeof url !== 'string' || !url) return false;
  try {
    return /^https?:$/.test(new URL(url).protocol);
  } catch {
    return true;
  }
}

export function initConsent(options) {
  if (instance) return instance;
  const config = { ...DEFAULTS, ...options, text: { ...DEFAULTS.text, ...options?.text } };
  if (!config.siteId || !config.apiUrl) throw new Error('initConsent needs siteId and apiUrl');
  if (!MODES.includes(config.mode)) throw new Error(`mode must be one of ${MODES.join(', ')}`);
  if (!isSafePolicyUrl(config.policyUrl)) {
    console.warn(`initConsent: policyUrl must be a relative path or an http(s) URL. Using ${DEFAULTS.policyUrl}.`);
    config.policyUrl = DEFAULTS.policyUrl;
  }
  instance = createConsent(config);
  return instance;
}

function createConsent(config) {
  const { mode, apiUrl, storageKey } = config;
  const asksConsent = mode === 'hybrid';
  let latestChoice = readChoice();
  let allowVisitorId = mode === 'full' || latestChoice === 'accepted';
  let recording = allowVisitorId;
  let tracker;
  let recorder;
  let dialog;

  function readChoice() {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }

  function writeChoice(choice) {
    try {
      localStorage.setItem(storageKey, choice);
    } catch {}
  }

  // Rybbit writes this ID on every load, only for feature flags. Hold it back until the visitor accepts.
  function blockVisitorId() {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === VISITOR_ID_KEY && !allowVisitorId) return;
      setItem.call(this, key, value);
    };
  }

  function loadTracker() {
    tracker ??= new Promise((resolve) => {
      if (mode !== 'full') blockVisitorId();
      const script = document.createElement('script');
      script.src = `${apiUrl}/script.js`;
      script.async = true;
      script.dataset.siteId = String(config.siteId);
      script.dataset.replaySampleRate = recording ? '100' : '0';
      script.dataset.replayMaskAllInputs = 'true';
      script.dataset.replayBlockSelector = config.replayBlockSelector;
      if (config.replayMaskTextSelectors.length) {
        script.dataset.replayMaskTextSelectors = JSON.stringify(config.replayMaskTextSelectors);
      }
      script.onload = script.onerror = () => resolve();
      document.head.append(script);
    });
    return tracker;
  }

  function identifyOnce() {
    if (!window.rybbit?.getUserId()) window.rybbit?.identify(crypto.randomUUID());
  }

  function loadRecorder() {
    recorder ??= new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = `${apiUrl}/replay.js`;
      script.onload = script.onerror = () => resolve();
      document.head.append(script);
    });
    return recorder;
  }

  // At sample rate 0 the recorder is not loaded, so a mid-visit Accept has to fetch it first.
  // The choice can change while it loads, so check it again before starting.
  async function startRecording() {
    if (!window.rrweb) await loadRecorder();
    if (latestChoice !== 'accepted' || recording) return;
    recording = true;
    window.rybbit?.startSessionReplay();
  }

  function stopRecording() {
    if (!recording) return;
    recording = false;
    window.rybbit?.stopSessionReplay();
  }

  async function choose(choice) {
    latestChoice = choice;
    writeChoice(choice);
    allowVisitorId = choice === 'accepted';
    closeDialog();
    await loadTracker();
    if (latestChoice !== choice) return;
    if (choice === 'declined') {
      stopRecording();
      window.rybbit?.clearUserId();
      try {
        localStorage.removeItem(VISITOR_ID_KEY);
      } catch {}
      return;
    }
    identifyOnce();
    await startRecording();
  }

  function element(tag, props = {}, children = []) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  }

  function buildDialog() {
    const { text } = config;
    if (config.injectStyles && !document.getElementById('rybbit-consent-styles')) {
      document.head.append(element('style', { id: 'rybbit-consent-styles', textContent: STYLES }));
    }
    const accept = element('button', { type: 'button', className: 'rybbit-consent-accept', textContent: text.accept });
    const decline = element('button', { type: 'button', className: 'rybbit-consent-decline', textContent: text.decline });
    accept.addEventListener('click', () => choose('accepted'));
    decline.addEventListener('click', () => choose('declined'));
    const policy = element('a', { href: config.policyUrl, textContent: text.policy });
    const panel = element('dialog', { className: 'rybbit-consent' }, [
      element('h2', { id: 'rybbit-consent-title', textContent: text.title }),
      element('p', {}, [`${text.body} `, policy]),
      element('div', { className: 'rybbit-consent-actions' }, [accept, decline]),
    ]);
    panel.setAttribute('aria-labelledby', 'rybbit-consent-title');
    return panel;
  }

  function openDialog() {
    dialog ??= buildDialog();
    if (!dialog.isConnected) document.body.append(dialog);
    if (!dialog.open) dialog.show();
  }

  function closeDialog() {
    if (dialog?.open) dialog.close();
  }

  function start() {
    loadTracker().then(() => {
      if (mode === 'full') identifyOnce();
    });
    if (!asksConsent) return;
    document.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('[data-privacy-choices]')) openDialog();
    });
    if (readChoice() === null) openDialog();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  return { openChoices: openDialog, getChoice: readChoice };
}
