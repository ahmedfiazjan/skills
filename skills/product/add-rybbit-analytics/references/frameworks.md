# Wiring consent.js into a site

`assets/consent.js` is one ES module with no dependencies. Copy it into the project (for example `js/consent.js`, `lib/consent.js` or `src/scripts/consent.js`) and call `initConsent` once. A second call returns the first instance, so a framework that runs effects twice is safe.

## Options

| Option | Default | Meaning |
|---|---|---|
| `siteId` | required | Numeric site ID from Rybbit |
| `apiUrl` | required | Rybbit API base, ending in `/api`. Rybbit Cloud: `https://app.rybbit.io/api` |
| `mode` | `'hybrid'` | `'hybrid'`, `'daily'` or `'full'` (see consent-modes.md) |
| `storageKey` | `'rybbit-privacy-choice'` | Local storage key for the visitor's choice. Name it after the site |
| `replayBlockSelector` | `'form'` | CSS selector for areas replay never records. Cover every form that takes personal data |
| `replayMaskTextSelectors` | `[]` | CSS selectors whose text is masked, such as a calculator result |
| `policyUrl` | `'/privacy'` | Link target inside the pop-up. A relative path or an `http(s)` URL. Anything else is replaced by the default, with a console warning |
| `injectStyles` | `true` | Adds a `<style>` tag with the pop-up's default look. Set `false` if your Content Security Policy blocks inline styles (see below) |
| `text` | see file | `title`, `body`, `policy`, `accept`, `decline`. Rewrite `body` to match the privacy policy |

All input values are masked by default (`data-replay-mask-all-inputs`). Masking inputs does not hide results shown as text, so list those in `replayMaskTextSelectors`.

The pop-up is a native `<dialog>`, opened non-modally at the bottom of the page. Any element with the attribute `data-privacy-choices` reopens it, so a footer link works with any framework:

```html
<button type="button" data-privacy-choices>Privacy choices</button>
```

## Plain HTML

Inline, for a site with no Content Security Policy:

```html
<script type="module">
  import { initConsent } from '/js/consent.js';
  initConsent({
    siteId: 1,
    apiUrl: 'https://analytics.example.com/api',
    storageKey: 'mysite-privacy-choice',
    replayBlockSelector: 'form',
    policyUrl: '/privacy.html',
  });
</script>
```

As an external module file, which works with a strict `script-src 'self'`. Put the `initConsent` call in its own file, for example `/js/analytics.js`, and load that:

```html
<script type="module" src="/js/analytics.js"></script>
```

```js
import { initConsent } from './consent.js';

initConsent({
  siteId: 1,
  apiUrl: 'https://analytics.example.com/api',
  storageKey: 'mysite-privacy-choice',
  policyUrl: '/privacy.html',
});
```

Put it on every page, or in a shared script included by every page.

## React and Next.js

Call it from a client component, once, in an effect. The module touches `document` only inside `initConsent`, so importing it during server rendering is safe.

```jsx
'use client';
import { useEffect } from 'react';
import { initConsent } from '@/lib/consent.js';

export function Analytics() {
  useEffect(() => {
    initConsent({
      siteId: Number(process.env.NEXT_PUBLIC_RYBBIT_SITE_ID),
      apiUrl: process.env.NEXT_PUBLIC_RYBBIT_API_URL,
      storageKey: 'mysite-privacy-choice',
      policyUrl: '/privacy',
    });
  }, []);
  return null;
}
```

Render `<Analytics />` once in the root layout. Put the footer button in the footer component. In a TypeScript project, set `allowJs` or add a one-line declaration for the module.

## Astro

Astro bundles a `<script>` tag in a layout as a module and runs it once per page load.

```astro
<script>
  import { initConsent } from '../scripts/consent.js';
  initConsent({
    siteId: Number(import.meta.env.PUBLIC_RYBBIT_SITE_ID),
    apiUrl: import.meta.env.PUBLIC_RYBBIT_API_URL,
    storageKey: 'mysite-privacy-choice',
  });
</script>
```

The footer button goes in the footer component.

## Any other framework

Import the module in the browser only, call `initConsent` once after the DOM exists, and add the footer element. Nothing else is needed.

## Content Security Policy

If the site sends a `Content-Security-Policy` header or meta tag, it must allow what consent.js and Rybbit do. Read the site's policy first, then test in a browser with the real policy and check the console for blocked requests.

- `script-src` must allow the analytics origin (the host of `apiUrl`). consent.js loads `script.js` from it, and `replay.js` after Accept.
- `connect-src` must allow the same origin, because the tracker sends events to it.
- The pop-up's default look is a `<style>` tag that consent.js adds. Under a strict `style-src` it is blocked, and the pop-up shows unstyled. Pick one fix:
  - allow it with `style-src 'unsafe-inline'`, or with a nonce on a tag you control,
  - or copy the `STYLES` block from consent.js into the site's own stylesheet and pass `injectStyles: false`.
- An inline `<script type="module">` needs `script-src 'unsafe-inline'` or a nonce. The external module file in the plain HTML example above needs neither.

## A site that already has its own tracker module

Keep the tracker module. Add the same behaviour to it: hold back the `rybbit-visitor-id` storage key, set `data-replay-sample-rate="0"` on the script tag, and load `/api/replay.js` only after an explicit choice. Or call `initConsent` from the module's start-up. A site in daily-only mode needs no pop-up, so use `mode: 'daily'`.

If the site offers its own "turn off statistics" switch, Rybbit checks opt-out only when its script loads. Do not load the script when the switch is set, and reload the page when the visitor turns it on after the script has loaded.

## A site that also uses Google Analytics

Wrap `gtag` so each `gtag('event', name, params)` also calls `window.rybbit.event(name, params)`, queued until the Rybbit script has loaded. That avoids editing every event call.

## Matching the site's design

Do not ship the default look if the site has its own. Two ways, both without editing consent.js:

1. Set CSS variables on `:root`: `--rybbit-consent-bg`, `--rybbit-consent-fg`, `--rybbit-consent-border`.
2. Override the classes `.rybbit-consent`, `.rybbit-consent-actions`, `.rybbit-consent-accept` and `.rybbit-consent-decline` in the site's own CSS. The built-in styles use `:where()`, so any site rule wins.

Reuse the site's own buttons, fonts and spacing. Keep Accept and Decline the same size and weight. If you switch the dialog to `showModal()`, remember that Escape closes it even when you cancel the event, and that a global `margin: 0` reset breaks its centring.
