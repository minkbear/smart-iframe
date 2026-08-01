/**
 * Smart Iframe Inertia adapter v3 — ES module for @inertiajs/vue3 apps
 *
 * Maximum-fidelity alternative to iframe-injector-v3.js: hooks Inertia router
 * events directly instead of patching XHR/fetch. Use ONE of the two, not both
 * (both respect the window.__SIF3__ guard).
 *
 * Usage (in the iframe app's entry, e.g. resources/js/app.ts):
 *
 *   import { router } from '@inertiajs/vue3'
 *   import { initSmartIframe } from './smart-iframe-inertia'
 *   initSmartIframe(router)
 *
 * Protocol: docs/PROTOCOL-V3.md — keep in sync with iframe-injector-v3.js
 * (helpers deliberately duplicated; this repo has no bundler).
 */

const STORAGE_KEY = 'sif3:uuid';
const ORIGIN_KEY = 'sif3:parentOrigin';

export function initSmartIframe(router, options = {}) {
    if (typeof window === 'undefined' || window.parent === window) {
        return () => {};
    }
    if (window.__SIF3__) {
        console.warn('SIF3 module: already initialized (injector or module), skipping');
        return () => {};
    }
    window.__SIF3__ = { mode: 'module' };

    let uuid = resolveUuid();
    // After an in-iframe hard visit, document.referrer points at the iframe's own
    // previous page, not the parent — recover the locked parent origin instead.
    let parentOrigin = readStoredParentOrigin();
    let lastUrl = window.location.href;
    let lastSentHeight = 0;
    let resizeTimer = null;
    const teardowns = [];

    // ---------------------------------------------------------------- send

    function targetOrigin() {
        if (parentOrigin) return parentOrigin;
        try {
            if (document.referrer) return new URL(document.referrer).origin;
        } catch (e) { /* fall through */ }
        return '*';
    }

    function send(type, payload) {
        try {
            window.parent.postMessage({
                v: 3,
                source: 'smart-iframe',
                type,
                uuid,
                timestamp: Date.now(),
                payload: payload || {}
            }, targetOrigin());
        } catch (e) {
            console.warn('SIF3 module: postMessage failed', e);
        }
    }

    // ---------------------------------------------------------------- uuid

    function resolveUuid() {
        try {
            const fromUrl = new URLSearchParams(window.location.search).get('uuid');
            if (fromUrl) {
                try { sessionStorage.setItem(STORAGE_KEY, fromUrl); } catch (e) { /* ignore */ }
                return fromUrl;
            }
        } catch (e) { /* ignore */ }
        try {
            return sessionStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return null;
        }
    }

    function readStoredParentOrigin() {
        try {
            return sessionStorage.getItem(ORIGIN_KEY) || null;
        } catch (e) {
            return null;
        }
    }

    function adoptUuid(assigned) {
        if (!assigned || uuid === assigned) return;
        uuid = assigned;
        try { sessionStorage.setItem(STORAGE_KEY, uuid); } catch (e) { /* ignore */ }
    }

    function onParentMessage(event) {
        if (event.source !== window.parent) return;
        const data = event.data;
        if (!data || data.v !== 3 || data.source !== 'smart-iframe') return;

        if (data.type === 'SIF3_CONFIG') {
            parentOrigin = event.origin;
            try { sessionStorage.setItem(ORIGIN_KEY, parentOrigin); } catch (e) { /* ignore */ }
            adoptUuid(data.payload && data.payload.uuid);
        } else if (data.type === 'SIF3_ADOPT') {
            adoptUuid(data.payload && data.payload.uuid);
        }
    }
    window.addEventListener('message', onParentMessage);
    teardowns.push(() => window.removeEventListener('message', onParentMessage));

    // ------------------------------------------------------- router hooks

    const offBefore = router.on('before', (event) => {
        const visit = event.detail.visit;
        if (visit && typeof visit.method === 'string' && visit.method.toLowerCase() !== 'get') {
            send('SIF3_SUBMIT', {
                method: visit.method.toLowerCase(),
                url: String(visit.url)
            });
        }
    });

    const offError = router.on('error', (event) => {
        send('SIF3_VALIDATION_ERROR', {
            errors: event.detail.errors || {},
            url: window.location.href
        });
    });

    const offSuccess = router.on('success', (event) => {
        const page = event.detail.page || {};
        send('SIF3_SUCCESS', {
            url: page.url || window.location.href,
            component: page.component || null
        });
    });

    const offNavigate = router.on('navigate', (event) => {
        const page = event.detail.page || {};
        const url = absoluteUrl(page.url) || window.location.href;
        if (url !== lastUrl) {
            const oldUrl = lastUrl;
            lastUrl = url;
            send('SIF3_NAVIGATE', { url, oldUrl, trigger: 'inertia' });
        }
    });

    teardowns.push(offBefore, offError, offSuccess, offNavigate);

    function absoluteUrl(url) {
        try {
            return url ? new URL(url, window.location.href).href : null;
        } catch (e) {
            return null;
        }
    }

    // -------------------------------------------------------------- resize

    function measureHeight() {
        const de = document.documentElement;
        const body = document.body;
        return Math.max(
            de ? de.scrollHeight : 0,
            de ? de.offsetHeight : 0,
            body ? body.scrollHeight : 0
        );
    }

    function reportHeight() {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const height = measureHeight();
            if (Math.abs(height - lastSentHeight) > 1) {
                lastSentHeight = height;
                send('SIF3_RESIZE', { height });
            }
        }, options.resizeDebounce || 100);
    }

    let observer = null;
    let pollTimer = null;
    function startResize() {
        try {
            if (typeof ResizeObserver !== 'undefined') {
                observer = new ResizeObserver(reportHeight);
                observer.observe(document.documentElement);
                if (document.body) observer.observe(document.body);
            } else {
                pollTimer = setInterval(reportHeight, 500);
            }
        } catch (e) {
            pollTimer = setInterval(reportHeight, 500);
        }
        reportHeight();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startResize, { once: true });
    } else {
        startResize();
    }
    teardowns.push(() => {
        if (observer) observer.disconnect();
        if (pollTimer) clearInterval(pollTimer);
        if (resizeTimer) clearTimeout(resizeTimer);
    });

    // ---------------------------------------------------------------- init

    send('SIF3_READY', {
        url: window.location.href,
        mode: 'module',
        hasInertia: true
    });

    return function teardown() {
        teardowns.forEach(fn => {
            try { fn(); } catch (e) { /* ignore */ }
        });
        delete window.__SIF3__;
    };
}
