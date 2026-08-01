/**
 * Smart Iframe Loader v3 — Inertia SPA support
 *
 * Parent-page loader for iframes running Inertia apps (AdonisJS + Vue + Inertia,
 * Laravel + Inertia, ...). Pure postMessage protocol — no load counting, no URL
 * polling, no progressive resize. The iframe page must include either
 * iframe-injector-v3.js (script tag) or smart-iframe-inertia.js (ES module).
 *
 * Laravel MPA sites should keep using smart-iframe-v2.js.
 *
 * Protocol: docs/PROTOCOL-V3.md
 */

class SmartIframeV3Loader {
    constructor() {
        this.iframes = new Map();
        this.events = new Map();
        this.init();
    }

    init() {
        window.addEventListener('message', this.handleMessage.bind(this));

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.autoDetect.bind(this));
        } else {
            this.autoDetect();
        }

        this.observeDOM();
    }

    // ------------------------------------------------------------ detect

    autoDetect() {
        document.querySelectorAll('[data-smart-iframe]').forEach(element => {
            this.initContainer(element, element.dataset.smartIframe);
        });

        document.querySelectorAll('.smartIframe[data-src]').forEach(element => {
            this.initContainer(element, element.dataset.src);
        });
    }

    initContainer(container, src) {
        if (!src) return;
        if (container.querySelector('iframe')) return;
        if (container.__sif3Uuid && this.iframes.has(container.__sif3Uuid)) return;

        const config = this.parseConfig(container, src);
        const uuid = this.generateUUID();
        const iframe = this.buildIframe(config, uuid);

        container.__sif3Uuid = uuid;
        if (!container.id) container.id = uuid;
        container.appendChild(iframe);

        this.iframes.set(uuid, {
            container,
            iframe,
            config,
            uuid,
            expectedOrigin: this.resolveExpectedOrigin(config),
            isReady: false,
            pendingSubmit: false,
            submitUrl: null,
            submitTimer: null,
            lastKnownUrl: config.src
        });

        this.addStyles();

        this.debug(config, `created iframe ${uuid} -> ${config.src}`);
        return uuid;
    }

    parseConfig(container, src) {
        const dataset = container.dataset;
        return {
            src,
            allowResize: dataset.allowResize !== 'false' && dataset.resize !== 'false',
            allowRedirect: dataset.allowRedirect !== 'false' && dataset.redirect !== 'false',
            allowEvents: dataset.allowEvents !== 'false' && dataset.events !== 'false',
            maxHeight: parseInt(dataset.maxHeight) || null,
            minHeight: parseInt(dataset.minHeight) || 200,
            initialHeight: parseInt(dataset.initialHeight) || parseInt(dataset.height) || 400,
            scrolling: dataset.scrolling || 'no',
            sandbox: dataset.sandbox || 'allow-scripts allow-same-origin allow-forms',
            title: dataset.title || 'Smart Iframe',
            iframeOrigin: dataset.iframeOrigin || null,
            submitTimeout: parseInt(dataset.submitTimeout) || 30000,
            debugMode: dataset.debugMode === 'true'
        };
    }

    resolveExpectedOrigin(config) {
        if (config.iframeOrigin) return config.iframeOrigin;
        try {
            return new URL(config.src, window.location.href).origin;
        } catch {
            return null;
        }
    }

    buildIframe(config, uuid) {
        const iframe = document.createElement('iframe');

        let src = config.src;
        const separator = src.includes('?') ? '&' : '?';
        src += `${separator}uuid=${uuid}`;

        iframe.src = src;
        iframe.scrolling = config.scrolling;
        iframe.title = config.title;
        iframe.className = 'smart-iframe';

        if (config.sandbox) {
            let sandboxValue = config.sandbox;
            // Enables the iframe to redirect the parent page on user interaction
            if (config.allowRedirect && !sandboxValue.includes('allow-top-navigation')) {
                sandboxValue += ' allow-top-navigation-by-user-activation';
            }
            iframe.sandbox = sandboxValue;
        }

        iframe.style.height = `${config.initialHeight}px`;
        iframe.setAttribute('loading', 'lazy');
        iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

        return iframe;
    }

    // ---------------------------------------------------------- messages

    handleMessage(event) {
        const data = event.data;
        if (!data || data.v !== 3 || data.source !== 'smart-iframe' || !data.type) return;

        // Resolve sender: by uuid first, then authoritatively by window reference
        let iframeData = data.uuid ? this.iframes.get(data.uuid) : null;
        const bySource = this.findBySource(event.source);

        if (bySource && iframeData !== bySource) {
            // uuid missing or stale (e.g. sessionStorage collision) — trust event.source
            iframeData = bySource;
        }
        if (!iframeData) return;

        // Origin check
        if (iframeData.expectedOrigin && event.origin !== iframeData.expectedOrigin) {
            this.debug(iframeData.config, `rejected message from unexpected origin ${event.origin}`);
            return;
        }
        // Without a window match, uuid alone is not enough
        if (!bySource && event.source !== iframeData.iframe.contentWindow) return;

        // Re-assign uuid when the iframe side lost or mismatched it
        if (data.uuid !== iframeData.uuid) {
            this.sendToIframe(iframeData, 'SIF3_ADOPT', { uuid: iframeData.uuid });
        }

        switch (data.type) {
            case 'SIF3_READY':
                this.handleReady(iframeData, data.payload);
                break;
            case 'SIF3_RESIZE':
                this.handleResize(iframeData, data.payload);
                break;
            case 'SIF3_NAVIGATE':
                this.handleNavigate(iframeData, data.payload);
                break;
            case 'SIF3_SUBMIT':
                this.handleSubmit(iframeData, data.payload);
                break;
            case 'SIF3_VALIDATION_ERROR':
                this.handleValidationError(iframeData, data.payload);
                break;
            case 'SIF3_SUCCESS':
                this.handleSuccess(iframeData, data.payload);
                break;
        }
    }

    findBySource(source) {
        for (const iframeData of this.iframes.values()) {
            if (iframeData.iframe.contentWindow === source) return iframeData;
        }
        return null;
    }

    sendToIframe(iframeData, type, payload) {
        const target = iframeData.iframe.contentWindow;
        if (!target) return;
        target.postMessage({
            v: 3,
            source: 'smart-iframe',
            type,
            uuid: iframeData.uuid,
            timestamp: Date.now(),
            payload: payload || {}
        }, iframeData.expectedOrigin || '*');
    }

    // ---------------------------------------------------------- handlers

    handleReady(iframeData, payload) {
        iframeData.isReady = true;
        this.sendToIframe(iframeData, 'SIF3_CONFIG', {
            uuid: iframeData.uuid,
            parentOrigin: window.location.origin
        });
        this.debug(iframeData.config, `iframe ready (mode: ${payload.mode})`);
        this.triggerEvent('iframe:ready', {
            uuid: iframeData.uuid,
            url: payload.url,
            mode: payload.mode,
            hasInertia: payload.hasInertia
        });
    }

    handleResize(iframeData, payload) {
        const { config, iframe } = iframeData;
        if (!config.allowResize) return;

        const height = Number(payload.height);
        if (!height || height <= 0) return;

        let finalHeight = Math.max(height, config.minHeight);
        if (config.maxHeight) {
            finalHeight = Math.min(finalHeight, config.maxHeight);
        }
        iframe.style.height = `${finalHeight}px`;

        this.triggerEvent('iframe:resize', { uuid: iframeData.uuid, height: finalHeight });
    }

    handleNavigate(iframeData, payload) {
        iframeData.lastKnownUrl = payload.url;
        this.triggerEvent('iframe:navigate', {
            uuid: iframeData.uuid,
            url: payload.url,
            oldUrl: payload.oldUrl,
            trigger: payload.trigger
        });
        this.maybeRedirect(iframeData, payload.url);
    }

    handleSubmit(iframeData, payload) {
        iframeData.pendingSubmit = true;
        iframeData.submitUrl = payload.url;

        if (iframeData.submitTimer) clearTimeout(iframeData.submitTimer);
        iframeData.submitTimer = setTimeout(() => {
            iframeData.pendingSubmit = false;
            iframeData.submitUrl = null;
        }, iframeData.config.submitTimeout);

        this.debug(iframeData.config, `form submit: ${payload.method} ${payload.url}`);
        this.triggerEvent('iframe:form-submit', {
            uuid: iframeData.uuid,
            method: payload.method,
            url: payload.url
        });
    }

    handleValidationError(iframeData, payload) {
        this.clearPendingSubmit(iframeData);
        this.debug(iframeData.config, 'validation error', payload.errors);
        this.triggerEvent('iframe:validation-error', {
            uuid: iframeData.uuid,
            errors: payload.errors,
            url: payload.url
        });
    }

    handleSuccess(iframeData, payload) {
        this.triggerEvent('iframe:success', {
            uuid: iframeData.uuid,
            url: payload.url,
            component: payload.component
        });
        this.maybeRedirect(iframeData, payload.url);
    }

    // ---------------------------------------------------------- redirect

    maybeRedirect(iframeData, currentUrl) {
        if (!iframeData.pendingSubmit) return;

        // URL change is the sole success signal; same-URL success (e.g. flash
        // message re-render) must not redirect the parent.
        const changed = currentUrl &&
            this.normalizeUrl(currentUrl, iframeData) !== this.normalizeUrl(iframeData.submitUrl, iframeData);
        if (!changed) return;

        this.clearPendingSubmit(iframeData);

        const { config } = iframeData;
        if (!config.allowRedirect) return;

        const redirectUrl = this.extractRedirectUrl(config.src);
        if (redirectUrl && this.isValidUrl(redirectUrl)) {
            this.debug(config, `redirecting parent to ${redirectUrl}`);
            this.triggerEvent('iframe:redirect', {
                uuid: iframeData.uuid,
                url: redirectUrl,
                fromUrl: currentUrl
            });
            window.location.href = redirectUrl;
        }
    }

    normalizeUrl(url, iframeData) {
        try {
            return new URL(url, iframeData.config.src).href;
        } catch {
            return url || '';
        }
    }

    clearPendingSubmit(iframeData) {
        iframeData.pendingSubmit = false;
        iframeData.submitUrl = null;
        if (iframeData.submitTimer) {
            clearTimeout(iframeData.submitTimer);
            iframeData.submitTimer = null;
        }
    }

    extractRedirectUrl(url) {
        try {
            const urlObj = new URL(url, window.location.href);
            const redirectParam = urlObj.searchParams.get('redirect') ||
                urlObj.searchParams.get('return') ||
                urlObj.searchParams.get('p');
            return redirectParam ? decodeURIComponent(redirectParam) : null;
        } catch {
            return null;
        }
    }

    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    }

    // ------------------------------------------------------------ events

    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }
        this.events.get(eventName).add(callback);
        return () => {
            this.events.get(eventName)?.delete(callback);
        };
    }

    triggerEvent(eventName, data) {
        const callbacks = this.events.get(eventName);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`SIF3: error in event callback for ${eventName}:`, error);
                }
            });
        }
    }

    // ------------------------------------------------------------- misc

    getIframe(identifier) {
        if (this.iframes.has(identifier)) return this.iframes.get(identifier);
        for (const data of this.iframes.values()) {
            if (data.container && data.container.id === identifier) return data;
        }
        return null;
    }

    getAllIframes() {
        return Array.from(this.iframes.values());
    }

    removeIframe(uuid) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        this.clearPendingSubmit(iframeData);
        if (iframeData.iframe.parentNode) {
            iframeData.iframe.parentNode.removeChild(iframeData.iframe);
        }
        delete iframeData.container.__sif3Uuid;
        this.iframes.delete(uuid);
        this.triggerEvent('iframe:removed', { uuid });
    }

    observeDOM() {
        if (!window.MutationObserver) return;

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;

                    if (node.hasAttribute?.('data-smart-iframe')) {
                        this.initContainer(node, node.dataset.smartIframe);
                    }
                    if (node.classList?.contains('smartIframe') && node.hasAttribute('data-src')) {
                        this.initContainer(node, node.dataset.src);
                    }

                    node.querySelectorAll?.('[data-smart-iframe]').forEach(element => {
                        this.initContainer(element, element.dataset.smartIframe);
                    });
                    node.querySelectorAll?.('.smartIframe[data-src]').forEach(element => {
                        this.initContainer(element, element.dataset.src);
                    });
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    addStyles() {
        if (document.getElementById('smart-iframe-v3-styles')) return;

        const style = document.createElement('style');
        style.id = 'smart-iframe-v3-styles';
        style.textContent = `
            .smart-iframe {
                border: none;
                width: 100%;
                display: block;
                transition: height 0.2s ease;
            }
        `;
        document.head.appendChild(style);
    }

    generateUUID() {
        return 'iframe_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    }

    debug(config, ...args) {
        if (config.debugMode) console.log('SIF3:', ...args);
    }
}

if (typeof window !== 'undefined') {
    window.SmartIframeV3Loader = SmartIframeV3Loader;
    window.smartIframeV3 = new SmartIframeV3Loader();
}
