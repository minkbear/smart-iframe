/**
 * Smart Iframe Injector v3 — standalone in-iframe helper for Inertia SPAs
 *
 * Include as a plain <script> in the iframe page (e.g. AdonisJS edge layout),
 * ideally in <head> before the app bundle. Zero app-code changes required.
 *
 * Detects Inertia traffic by patching XMLHttpRequest / fetch (X-Inertia header),
 * SPA navigation by patching history.pushState/replaceState, and reports real
 * content height via ResizeObserver.
 *
 * Protocol: docs/PROTOCOL-V3.md
 */

(function () {
    'use strict';

    // Only meaningful inside an iframe
    if (window.parent === window) return;

    // Double-include guard (also set by smart-iframe-inertia.js module)
    if (window.__SIF3__) {
        console.warn('SIF3 injector: already initialized, skipping');
        return;
    }
    window.__SIF3__ = { mode: 'injector' };

    var STORAGE_KEY = 'sif3:uuid';
    var ORIGIN_KEY = 'sif3:parentOrigin';
    var uuid = null;
    var parentOrigin = null; // locked after SIF3_CONFIG

    // After an in-iframe navigation (e.g. Inertia hard visit), document.referrer
    // points at the iframe's own previous page — not the parent — so a fresh
    // document must recover the parent origin from sessionStorage or its READY
    // message would be posted to the wrong targetOrigin and silently dropped.
    try {
        parentOrigin = sessionStorage.getItem(ORIGIN_KEY) || null;
    } catch (e) {}
    var lastUrl = window.location.href;
    var lastSentHeight = 0;

    // ---------------------------------------------------------------- uuid

    function resolveUuid() {
        try {
            var fromUrl = new URLSearchParams(window.location.search).get('uuid');
            if (fromUrl) {
                uuid = fromUrl;
                try { sessionStorage.setItem(STORAGE_KEY, uuid); } catch (e) {}
                return;
            }
        } catch (e) {}

        // Hard visit (inertia.location / 409 X-Inertia-Location) drops ?uuid=
        try {
            var stored = sessionStorage.getItem(STORAGE_KEY);
            if (stored) uuid = stored;
        } catch (e) {}
        // If still null, parent will assign one via SIF3_ADOPT (matched by event.source)
    }

    // ---------------------------------------------------------------- send

    function targetOrigin() {
        if (parentOrigin) return parentOrigin;
        try {
            if (document.referrer) return new URL(document.referrer).origin;
        } catch (e) {}
        return '*';
    }

    function send(type, payload) {
        try {
            window.parent.postMessage({
                v: 3,
                source: 'smart-iframe',
                type: type,
                uuid: uuid,
                timestamp: Date.now(),
                payload: payload || {}
            }, targetOrigin());
        } catch (e) {
            console.warn('SIF3 injector: postMessage failed', e);
        }
    }

    // ------------------------------------------------- parent -> iframe

    window.addEventListener('message', function (event) {
        if (event.source !== window.parent) return;
        var data = event.data;
        if (!data || data.v !== 3 || data.source !== 'smart-iframe') return;

        if (data.type === 'SIF3_CONFIG') {
            parentOrigin = event.origin;
            try { sessionStorage.setItem(ORIGIN_KEY, parentOrigin); } catch (e) {}
            if (data.payload && data.payload.uuid) adoptUuid(data.payload.uuid);
        } else if (data.type === 'SIF3_ADOPT') {
            if (data.payload && data.payload.uuid) adoptUuid(data.payload.uuid);
        }
    });

    function adoptUuid(assigned) {
        if (uuid === assigned) return;
        uuid = assigned;
        try { sessionStorage.setItem(STORAGE_KEY, uuid); } catch (e) {}
    }

    // ---------------------------------------------------------- history

    function sendNavigate(trigger) {
        var url = window.location.href;
        if (url === lastUrl) return;
        var oldUrl = lastUrl;
        lastUrl = url;
        send('SIF3_NAVIGATE', { url: url, oldUrl: oldUrl, trigger: trigger });
    }

    function patchHistory() {
        try {
            var push = history.pushState;
            var replace = history.replaceState;
            history.pushState = function () {
                var r = push.apply(history, arguments);
                sendNavigate('pushState');
                return r;
            };
            history.replaceState = function () {
                var r = replace.apply(history, arguments);
                sendNavigate('replaceState');
                return r;
            };
            window.addEventListener('popstate', function () {
                sendNavigate('popstate');
            });
        } catch (e) {
            console.warn('SIF3 injector: history patch failed', e);
        }
    }

    // ---------------------------------------------- Inertia responses

    function isNonGet(method) {
        return typeof method === 'string' && method.toUpperCase() !== 'GET';
    }

    function handleInertiaPage(page) {
        // page = { component, props, url, version }
        if (!page || typeof page !== 'object') return;
        var errors = page.props && page.props.errors;
        if (errors && typeof errors === 'object' && Object.keys(errors).length > 0) {
            send('SIF3_VALIDATION_ERROR', { errors: errors, url: page.url || window.location.href });
        } else {
            send('SIF3_SUCCESS', { url: page.url || window.location.href, component: page.component || null });
        }
    }

    // ---------------------------------------------------------- XHR

    function patchXHR() {
        try {
            var proto = XMLHttpRequest.prototype;
            var open = proto.open;
            var setHeader = proto.setRequestHeader;
            var origSend = proto.send;

            proto.open = function (method, url) {
                this.__sif3 = { method: method, url: url, inertia: false };
                return open.apply(this, arguments);
            };

            proto.setRequestHeader = function (name, value) {
                if (this.__sif3 && String(name).toLowerCase() === 'x-inertia') {
                    this.__sif3.inertia = true;
                }
                return setHeader.apply(this, arguments);
            };

            proto.send = function () {
                var meta = this.__sif3;
                if (meta && meta.inertia && isNonGet(meta.method)) {
                    send('SIF3_SUBMIT', {
                        method: String(meta.method).toLowerCase(),
                        url: resolveUrl(meta.url)
                    });
                }
                if (meta) {
                    this.addEventListener('load', function () {
                        try {
                            var isInertia = meta.inertia ||
                                !!this.getResponseHeader('x-inertia');
                            if (!isInertia) return;
                            var page = JSON.parse(this.responseText);
                            handleInertiaPage(page);
                        } catch (e) {
                            // 409 hard-visit or non-JSON body: nothing to parse.
                            // uuid recovery is covered by sessionStorage on reload.
                        }
                    });
                }
                return origSend.apply(this, arguments);
            };
        } catch (e) {
            console.warn('SIF3 injector: XHR patch failed', e);
        }
    }

    // --------------------------------------------------------- fetch

    function headersHaveInertia(headers) {
        try {
            if (!headers) return false;
            if (typeof Headers !== 'undefined' && headers instanceof Headers) {
                return headers.has('X-Inertia');
            }
            if (Array.isArray(headers)) {
                return headers.some(function (h) {
                    return String(h[0]).toLowerCase() === 'x-inertia';
                });
            }
            return Object.keys(headers).some(function (k) {
                return k.toLowerCase() === 'x-inertia';
            });
        } catch (e) {
            return false;
        }
    }

    function patchFetch() {
        if (typeof window.fetch !== 'function') return;
        try {
            var origFetch = window.fetch;
            window.fetch = function (input, init) {
                var method = 'GET';
                var url = '';
                var inertia = false;
                try {
                    if (typeof Request !== 'undefined' && input instanceof Request) {
                        method = input.method || 'GET';
                        url = input.url;
                        inertia = input.headers && input.headers.has('X-Inertia');
                    } else {
                        url = String(input);
                    }
                    if (init) {
                        if (init.method) method = init.method;
                        if (headersHaveInertia(init.headers)) inertia = true;
                    }
                } catch (e) {}

                if (inertia && isNonGet(method)) {
                    send('SIF3_SUBMIT', {
                        method: String(method).toLowerCase(),
                        url: resolveUrl(url)
                    });
                }

                var promise = origFetch.apply(this, arguments);
                if (inertia) {
                    promise = promise.then(function (response) {
                        try {
                            var isInertia = inertia ||
                                response.headers.get('x-inertia');
                            if (isInertia) {
                                response.clone().json()
                                    .then(handleInertiaPage)
                                    .catch(function () {});
                            }
                        } catch (e) {}
                        return response;
                    });
                }
                return promise;
            };
        } catch (e) {
            console.warn('SIF3 injector: fetch patch failed', e);
        }
    }

    function resolveUrl(url) {
        try {
            return new URL(url, window.location.href).href;
        } catch (e) {
            return String(url || window.location.href);
        }
    }

    // -------------------------------------------------------- resize

    function measureHeight() {
        var de = document.documentElement;
        var body = document.body;
        return Math.max(
            de ? de.scrollHeight : 0,
            de ? de.offsetHeight : 0,
            body ? body.scrollHeight : 0
        );
    }

    var resizeTimer = null;
    function reportHeight() {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            var height = measureHeight();
            if (Math.abs(height - lastSentHeight) > 1) {
                lastSentHeight = height;
                send('SIF3_RESIZE', { height: height });
            }
        }, 100);
    }

    function setupResize() {
        var start = function () {
            try {
                if (typeof ResizeObserver !== 'undefined') {
                    var observer = new ResizeObserver(reportHeight);
                    observer.observe(document.documentElement);
                    if (document.body) observer.observe(document.body);
                } else {
                    setInterval(reportHeight, 500);
                }
            } catch (e) {
                setInterval(reportHeight, 500);
            }
            reportHeight();
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start);
        } else {
            start();
        }
    }

    // ---------------------------------------------------------- init

    resolveUuid();
    patchHistory();
    patchXHR();
    patchFetch();

    send('SIF3_READY', {
        url: window.location.href,
        mode: 'injector',
        // Best-effort hint only; Inertia is detected per-request via headers
        hasInertia: !!document.getElementById('app') &&
            !!(document.getElementById('app').getAttribute('data-page'))
    });

    setupResize();

    console.log('SIF3 injector: initialized', { uuid: uuid });
})();
