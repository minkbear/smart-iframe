# Smart Iframe Protocol v3

Single source of truth for the postMessage contract between:

- `src/smart-iframe-v3.js` — parent-page loader
- `src/iframe-injector-v3.js` — standalone in-iframe script (zero app changes)
- `src/smart-iframe-inertia.js` — optional ES module for `@inertiajs/vue3` apps

v3 targets **Inertia SPA** iframes only (AdonisJS + Vue + Inertia, Laravel + Inertia, etc.).
Laravel MPA customers stay on v2 (`src/smart-iframe-v2.js` + root `iframe-injector.js`).

## Envelope

Every message, both directions:

```js
{
  v: 3,                    // protocol version, always 3
  source: 'smart-iframe',  // constant discriminator
  type: 'SIF3_*',          // see tables below
  uuid: string | null,     // iframe correlation id (null only while unknown)
  timestamp: number,       // Date.now() at send
  payload: { ... }         // type-specific, always an object
}
```

Receivers MUST ignore any message where `v !== 3 || source !== 'smart-iframe'`.

## Iframe → parent

| Type | Payload | Sent when |
|---|---|---|
| `SIF3_READY` | `{ url, mode: 'injector'\|'module', hasInertia: boolean }` | injector/module init completed. `uuid` may be `null` if lost (hard visit). |
| `SIF3_RESIZE` | `{ height: number }` | ResizeObserver detected content height change (debounced ~100ms, only when Δ > 1px). |
| `SIF3_NAVIGATE` | `{ url, oldUrl, trigger: 'pushState'\|'replaceState'\|'popstate'\|'inertia' }` | SPA URL changed. |
| `SIF3_SUBMIT` | `{ method: 'post'\|'put'\|'patch'\|'delete', url }` | Non-GET Inertia visit started (XHR/fetch with `X-Inertia` request header, or `router.on('before')`). |
| `SIF3_VALIDATION_ERROR` | `{ errors: { field: message }, url }` | Inertia response carried non-empty `props.errors`. Note: Inertia returns these with HTTP **200** — status codes are not the signal. |
| `SIF3_SUCCESS` | `{ url, component }` | Inertia response parsed OK with empty/absent `props.errors`. |

## Parent → iframe

| Type | Payload | Purpose |
|---|---|---|
| `SIF3_CONFIG` | `{ uuid, parentOrigin }` | Reply to `SIF3_READY`. Iframe side locks its postMessage target origin to `event.origin` of this message. |
| `SIF3_ADOPT` | `{ uuid }` | uuid recovery: parent identified the sender via `event.source` and assigns the correct uuid. Iframe side adopts it and rewrites sessionStorage. |

Parent always posts replies to the specific `iframe.contentWindow` with an explicit
`targetOrigin` (the expected iframe origin), never `'*'` (except when the expected
origin cannot be determined).

## uuid lifecycle

Parent appends `?uuid=<id>` to the iframe src at build time (same as v2).
Inside the iframe, uuid is resolved in three layers:

1. **URL param** — `?uuid=` from `location.search` at script init. pushState
   navigation never reloads the page, so the closure variable survives all normal
   Inertia visits.
2. **sessionStorage** — key `sif3:uuid`. Written whenever layer 1 succeeds. Read
   at init when layer 1 fails — i.e. after an Inertia *hard visit*
   (`inertia.location()` / 409 + `X-Inertia-Location` full reload) where the new
   URL lacks `?uuid=`.
3. **`SIF3_ADOPT`** (authoritative) — sessionStorage is shared by all same-origin
   iframes in one tab, so it can hold a wrong uuid when multiple iframes exist.
   The iframe side therefore always sends `SIF3_READY` with whatever uuid it has
   (possibly `null`); the parent matches `event.source` against each tracked
   `iframe.contentWindow` and replies `SIF3_ADOPT { uuid }` to that specific
   window when the claimed uuid is missing or wrong. The iframe side adopts the
   assigned uuid and persists it.

## Security rules

- Parent validates `event.origin` against the origin derived from `data-src`
  (overridable via `data-iframe-origin`) before processing any message.
- Iframe side accepts `SIF3_CONFIG` / `SIF3_ADOPT` only when
  `event.source === window.parent`; after `SIF3_CONFIG` it locks all outgoing
  messages to that origin. The locked origin is also persisted to
  `sessionStorage['sif3:parentOrigin']` — after an in-iframe hard visit,
  `document.referrer` points at the iframe's own previous page (not the parent),
  so a fresh document must restore the lock from sessionStorage or its `SIF3_READY`
  would be posted to the wrong targetOrigin and silently dropped. Before any lock
  exists, target origin is the `document.referrer` origin when parseable, else `'*'`.
- Parent-side redirects only accept `http:`/`https:` URLs (`isValidUrl`).

## Redirect semantics (parent)

The redirect target comes from the original `data-src` query string:
`redirect` > `return` > `p` (same as v2 `extractRedirectUrl`).

State machine per iframe:

```
SIF3_SUBMIT (non-GET)        -> pendingSubmit = true, submitUrl = payload.url
SIF3_VALIDATION_ERROR        -> pendingSubmit = false            (+ event)
SIF3_SUCCESS | SIF3_NAVIGATE -> if pendingSubmit && payload.url !== submitUrl:
                                    if allowRedirect && redirectUrl: perform redirect
                                pendingSubmit = false
timeout (data-submit-timeout, default 30000ms)
                             -> pendingSubmit = false
```

**URL change is the sole success signal.** An Inertia success that re-renders the
same URL (e.g. flash message on the same page) does NOT trigger a redirect.

## Parent public events

`smartIframeV3.on(name, cb)` with names:
`iframe:ready`, `iframe:resize`, `iframe:navigate`, `iframe:form-submit`,
`iframe:validation-error`, `iframe:success`, `iframe:redirect`.

## Double-include guard

Both iframe-side implementations set `window.__SIF3__` on init and no-op if it is
already set. Ship **either** the injector **or** the module in one page, not both.
