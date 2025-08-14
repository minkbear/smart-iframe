class SmartIframeLoader {
    constructor() {
        this.iframes = new Map();
        this.events = new Map();
        this.messageTypes = {
            RESIZE: 'resize',
            REDIRECT: 'redirect',
            EVENT: 'event',
            READY: 'ready',
            CONFIG: 'config',
            ERROR: 'error'
        };
        
        this.init();
    }

    init() {
        // Listen for messages from iframes
        window.addEventListener('message', this.handleMessage.bind(this));
        
        // Auto-detect and initialize iframes when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.autoDetect.bind(this));
        } else {
            this.autoDetect();
        }
        
        // Watch for dynamically added iframes
        this.observeDOM();
    }

    // Auto-detect iframes with special attributes
    autoDetect() {
        // Original method
        const elements = document.querySelectorAll('[data-smart-iframe]');
        elements.forEach(element => {
            if (!element.id) {
                this.createSmartIframe(element);
            }
        });
        
        // Simple method for non-developers
        const simpleElements = document.querySelectorAll('.smartIframe[data-src]');
        simpleElements.forEach(element => {
            if (!element.id) {
                this.createSimpleIframe(element);
            }
        });
    }

    // Create smart iframe
    createSmartIframe(container) {
        const config = this.parseConfig(container);
        const iframe = this.buildIframe(config);
        const uuid = this.generateUUID();
        
        // Set container ID
        container.id = uuid;
        container.appendChild(iframe);
        
        // Store iframe reference
        this.iframes.set(uuid, {
            container,
            iframe,
            config,
            isReady: false
        });
        
        // Add styles
        this.addStyles();
        
        // Send initial config when iframe loads
        iframe.addEventListener('load', () => {
            this.sendConfig(uuid, config);
            this.tryAutoResize(uuid, config);
            this.startUrlMonitoring(uuid, config);
            
            // Set ready state with fallback for cross-origin iframes
            this.setReadyWithFallback(uuid);
        });
        
        return uuid;
    }

    // Create simple iframe for non-developers
    createSimpleIframe(container) {
        const dataset = container.dataset;
        
        // Simple config mapping
        const config = {
            src: dataset.src,
            allowResize: dataset.resize !== 'false',
            allowRedirect: dataset.redirect !== 'false',
            allowEvents: dataset.events !== 'false',
            maxHeight: parseInt(dataset.maxHeight) || parseInt(dataset.max) || 9000,
            minHeight: parseInt(dataset.minHeight) || parseInt(dataset.min) || 400,
            initialHeight: parseInt(dataset.height) || parseInt(dataset.initialHeight) || 800,
            scrolling: dataset.scrolling || 'no',
            sandbox: dataset.sandbox || 'allow-scripts allow-same-origin allow-forms',
            title: dataset.title || 'Smart Iframe'
        };
        
        const iframe = this.buildIframe(config);
        const uuid = this.generateUUID();
        
        // Set container ID
        container.id = uuid;
        container.appendChild(iframe);
        
        // Store iframe reference
        this.iframes.set(uuid, {
            container,
            iframe,
            config,
            isReady: false
        });
        
        // Add styles
        this.addStyles();
        
        // Send initial config when iframe loads
        iframe.addEventListener('load', () => {
            this.sendConfig(uuid, config);
            this.tryAutoResize(uuid, config);
            this.startUrlMonitoring(uuid, config);
            this.setReadyWithFallback(uuid);
        });
        
        return uuid;
    }

    // Parse configuration from element attributes
    parseConfig(element) {
        const dataset = element.dataset;
        return {
            src: dataset.smartIframe,
            allowResize: dataset.allowResize !== 'false',
            allowRedirect: dataset.allowRedirect !== 'false',
            allowEvents: dataset.allowEvents !== 'false',
            maxHeight: parseInt(dataset.maxHeight) || null,
            minHeight: parseInt(dataset.minHeight) || 200,
            initialHeight: parseInt(dataset.initialHeight) || 200,
            scrolling: dataset.scrolling || 'no',
            sandbox: dataset.sandbox || 'allow-scripts allow-same-origin allow-forms',
            title: dataset.title || 'Smart Iframe'
        };
    }

    // Build iframe element
    buildIframe(config) {
        const iframe = document.createElement('iframe');
        
        iframe.src = config.src;
        iframe.scrolling = config.scrolling;
        iframe.title = config.title;
        iframe.className = 'smart-iframe';
        
        if (config.sandbox) {
            iframe.sandbox = config.sandbox;
        }
        
        // Set initial height
        iframe.style.height = `${config.initialHeight}px`;
        
        // Security attributes
        iframe.setAttribute('loading', 'lazy');
        iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        
        return iframe;
    }

    // Send configuration to iframe
    sendConfig(uuid, config) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const message = {
            type: this.messageTypes.CONFIG,
            uuid,
            config: {
                parentUrl: window.location.href,
                allowResize: config.allowResize,
                allowRedirect: config.allowRedirect,
                allowEvents: config.allowEvents
            }
        };
        
        iframeData.iframe.contentWindow?.postMessage(message, '*');
    }

    // Try auto-resize for cross-origin iframes
    tryAutoResize(uuid, config) {
        if (!config.allowResize) return;
        
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { iframe } = iframeData;
        
        // For same-origin iframes, try to get content height
        try {
            const contentHeight = iframe.contentDocument?.body?.scrollHeight;
            if (contentHeight && contentHeight > config.initialHeight) {
                let newHeight = Math.max(contentHeight, config.minHeight);
                if (config.maxHeight) {
                    newHeight = Math.min(newHeight, config.maxHeight);
                }
                iframe.style.height = `${newHeight}px`;
                this.triggerEvent('iframe:resize', { uuid, height: newHeight, auto: true });
            }
        } catch (e) {
            // Cross-origin - can't access content, use polling for scroll detection
            this.setupScrollDetection(uuid, config);
        }
    }

    // Enhanced resize detection for cross-origin iframes
    setupScrollDetection(uuid, config) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { iframe } = iframeData;
        
        // Method 1: Progressive height increase based on common content patterns
        this.setupProgressiveResize(uuid, config);
        
        // Method 2: Intersection Observer for visibility-based resize
        this.setupIntersectionResize(uuid, config);
        
        // Method 3: Scroll-based detection (improved)
        this.setupScrollBasedResize(uuid, config);
    }

    // Progressive resize based on content loading
    setupProgressiveResize(uuid, config) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { iframe } = iframeData;
        let currentHeight = config.initialHeight;
        const targetHeight = config.maxHeight || Math.min(window.innerHeight * 0.8, 1200);
        const step = 100; // Increase by 100px per step
        let attempts = 0;
        const maxAttempts = 20;
        
        const progressiveResize = () => {
            if (attempts >= maxAttempts) return;
            attempts++;
            
            // Gradually increase height to accommodate content
            currentHeight = Math.min(currentHeight + step, targetHeight);
            iframe.style.height = `${currentHeight}px`;
            
            
            this.triggerEvent('iframe:resize', { 
                uuid, 
                height: currentHeight, 
                auto: true,
                method: 'progressive'
            });
            
            // Continue if haven't reached target
            if (currentHeight < targetHeight) {
                setTimeout(progressiveResize, 1500);
            }
        };
        
        // Start after iframe loads
        setTimeout(progressiveResize, 2000);
    }

    // Intersection Observer for better resize detection
    setupIntersectionResize(uuid, config) {
        if (!window.IntersectionObserver) return;
        
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { iframe } = iframeData;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // When iframe comes into view, try to optimize height
                    const viewportHeight = window.innerHeight;
                    const optimalHeight = Math.min(viewportHeight * 0.7, config.maxHeight || 1000);
                    
                    if (optimalHeight > parseInt(iframe.style.height)) {
                        iframe.style.height = `${optimalHeight}px`;
                        
                        this.triggerEvent('iframe:resize', { 
                            uuid, 
                            height: optimalHeight, 
                            auto: true,
                            method: 'intersection'
                        });
                    }
                }
            });
        }, { threshold: 0.1 });
        
        observer.observe(iframe);
        iframeData.intersectionObserver = observer;
    }

    // Improved scroll-based detection
    setupScrollBasedResize(uuid, config) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { iframe } = iframeData;
        
        // Listen for various interaction events
        const events = ['mouseenter', 'mouseover', 'focus', 'click'];
        
        events.forEach(eventType => {
            iframe.addEventListener(eventType, () => {
                // Check if iframe needs more height
                const currentHeight = parseInt(iframe.style.height);
                const maxAllowed = config.maxHeight || Math.min(window.innerHeight * 0.9, 1200);
                
                if (currentHeight < maxAllowed) {
                    const newHeight = Math.min(currentHeight + 200, maxAllowed);
                    iframe.style.height = `${newHeight}px`;
                    
                    
                    this.triggerEvent('iframe:resize', { 
                        uuid, 
                        height: newHeight, 
                        auto: true,
                        method: 'event-based',
                        trigger: eventType
                    });
                }
            }, { once: true });
        });
    }

    // Set ready state with fallback for cross-origin iframes
    setReadyWithFallback(uuid) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        // Wait for READY message, but fallback after 3 seconds
        setTimeout(() => {
            if (!iframeData.isReady) {
                this.handleReady(uuid, iframeData);
            }
        }, 3000);
    }

    // Monitor URL changes in iframe for redirect detection
    startUrlMonitoring(uuid, config) {
        if (!config.allowRedirect) return;
        
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { iframe } = iframeData;
        let originalSrc = iframe.src;
        
        // Store monitoring data
        iframeData.monitoring = {
            originalSrc,
            redirectCount: 0,
            lastActivity: Date.now()
        };
        
        
        // Method 1: Listen for navigation events
        this.setupNavigationDetection(uuid);
        
        // Method 2: Monitor iframe load events (for redirects)
        this.setupLoadEventMonitoring(uuid);
        
        // Method 3: Performance observer for navigation timing
        this.setupPerformanceMonitoring(uuid);
    }

    // Setup navigation detection using various methods
    setupNavigationDetection(uuid) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { iframe } = iframeData;
        
        // Listen for iframe load events (indicates navigation)
        const handleLoad = () => {
            iframeData.monitoring.redirectCount++;
            iframeData.monitoring.lastActivity = Date.now();
            
            // Trigger redirect detection event
            this.triggerEvent('iframe:navigation-detected', { 
                uuid, 
                timestamp: Date.now(),
                redirectCount: iframeData.monitoring.redirectCount
            });
            
            // For cross-origin, we can't get the exact URL, but we know navigation happened
            // Try to get redirect URL from query parameter
            const redirectUrl = this.extractRedirectUrl(iframeData.monitoring.originalSrc);
            this.handleDetectedRedirect(uuid, redirectUrl || 'cross-origin-navigation', iframeData.monitoring.originalSrc);
        };
        
        iframe.addEventListener('load', handleLoad);
        
        // Store handler for cleanup
        iframeData.loadHandler = handleLoad;
    }

    // Monitor load events to detect navigation
    setupLoadEventMonitoring(uuid) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { iframe } = iframeData;
        let loadCount = 0;
        
        const originalLoad = iframe.onload;
        iframe.onload = (event) => {
            loadCount++;
            
            // Skip first load (initial page load)
            if (loadCount > 1) {
                this.triggerEvent('iframe:redirect-detected', { 
                    uuid, 
                    newUrl: 'cross-origin-redirect',
                    oldUrl: iframeData.monitoring.originalSrc,
                    redirectCount: loadCount - 1,
                    method: 'load-event'
                });
            }
            
            // Call original handler if exists
            if (originalLoad) originalLoad.call(iframe, event);
        };
    }

    // Setup performance monitoring (experimental)
    setupPerformanceMonitoring(uuid) {
        if (!window.PerformanceObserver) return;
        
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                    if (entry.entryType === 'navigation') {
                        // This might help detect navigation in some cases
                    }
                });
            });
            
            observer.observe({ entryTypes: ['navigation'] });
            iframeData.performanceObserver = observer;
        } catch (e) {
        }
    }

    // Extract redirect URL from query parameters
    extractRedirectUrl(originalUrl) {
        try {
            const url = new URL(originalUrl);
            const redirectParam = url.searchParams.get('redirect');
            if (redirectParam) {
                return decodeURIComponent(redirectParam);
            }
            return null;
        } catch {
            return null;
        }
    }

    // Handle detected redirect (without postMessage)
    handleDetectedRedirect(uuid, newUrl, oldUrl) {
        
        const iframeData = this.iframes.get(uuid);
        if (!iframeData?.config.allowRedirect) return;
        
        // Always trigger redirect event for logging
        this.triggerEvent('iframe:redirect-detected', { 
            uuid, 
            newUrl, 
            oldUrl,
            redirectCount: iframeData.monitoring?.redirectCount || 0
        });
        
        // Auto-redirect for detected navigation
        if (newUrl && newUrl !== 'cross-origin-navigation' && this.isValidUrl(newUrl)) {
            window.location.href = newUrl;
            this.triggerEvent('iframe:redirect', { 
                uuid, 
                url: newUrl, 
                target: '_self',
                detected: true,
                auto: true
            });
        } else {
        }
    }

    // Security check for auto-redirects
    shouldAllowAutoRedirect(newUrl, oldUrl) {
        try {
            const newUrlObj = new URL(newUrl);
            const oldUrlObj = new URL(oldUrl);
            
            // Only allow same domain redirects without user confirmation
            return newUrlObj.hostname === oldUrlObj.hostname;
        } catch {
            return false;
        }
    }

    // Handle messages from iframes
    handleMessage(event) {
        if (!this.isValidMessage(event)) return;
        
        const { type, uuid, payload } = event.data;
        const iframeData = this.iframes.get(uuid);
        
        if (!iframeData) return;
        
        switch (type) {
            case this.messageTypes.READY:
                this.handleReady(uuid, iframeData);
                break;
                
            case this.messageTypes.RESIZE:
                this.handleResize(uuid, iframeData, payload);
                break;
                
            case this.messageTypes.REDIRECT:
                this.handleRedirect(uuid, iframeData, payload);
                break;
                
            case this.messageTypes.EVENT:
                this.handleEvent(uuid, iframeData, payload);
                break;
                
            case this.messageTypes.ERROR:
                this.handleError(uuid, iframeData, payload);
                break;
        }
    }

    // Validate incoming messages
    isValidMessage(event) {
        try {
            const { type, uuid } = event.data;
            return type && uuid && this.iframes.has(uuid);
        } catch {
            return false;
        }
    }

    // Handle iframe ready state
    handleReady(uuid, iframeData) {
        if (iframeData.isReady) return; // Already ready
        
        iframeData.isReady = true;
        this.triggerEvent('iframe:ready', { uuid, iframe: iframeData });
    }

    // Handle resize requests
    handleResize(uuid, iframeData, payload) {
        if (!iframeData.config.allowResize) return;
        
        const { height, width } = payload;
        const { iframe, config } = iframeData;
        
        if (height) {
            let newHeight = Math.max(height, config.minHeight);
            if (config.maxHeight) {
                newHeight = Math.min(newHeight, config.maxHeight);
            }
            iframe.style.height = `${newHeight}px`;
        }
        
        if (width) {
            iframe.style.width = `${width}px`;
        }
        
        this.triggerEvent('iframe:resize', { uuid, height, width });
    }

    // Handle redirect requests
    handleRedirect(uuid, iframeData, payload) {
        if (!iframeData.config.allowRedirect) return;
        
        const { url, target = '_self' } = payload;
        
        if (this.isValidUrl(url)) {
            if (target === '_parent' || target === '_top') {
                window.open(url, target);
            } else {
                window.location.href = url;
            }
            
            this.triggerEvent('iframe:redirect', { uuid, url, target });
        }
    }

    // Handle custom events
    handleEvent(uuid, iframeData, payload) {
        if (!iframeData.config.allowEvents) return;
        
        const { eventName, data } = payload;
        this.triggerEvent(`iframe:${eventName}`, { uuid, data });
    }

    // Handle errors
    handleError(uuid, iframeData, payload) {
        console.error(`Smart Iframe Error [${uuid}]:`, payload);
        this.triggerEvent('iframe:error', { uuid, error: payload });
    }

    // Validate URLs for security
    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    }

    // Event system
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
                    console.error(`Error in event callback for ${eventName}:`, error);
                }
            });
        }
    }

    // Send message to specific iframe
    sendToIframe(uuid, type, payload) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData?.isReady) return false;
        
        const message = { type, uuid, payload };
        iframeData.iframe.contentWindow?.postMessage(message, '*');
        return true;
    }

    // Remove iframe
    removeIframe(uuid) {
        const iframeData = this.iframes.get(uuid);
        if (iframeData) {
            // Clean up monitoring interval
            if (iframeData.monitoringInterval) {
                clearInterval(iframeData.monitoringInterval);
            }
            
            iframeData.container.removeChild(iframeData.iframe);
            this.iframes.delete(uuid);
            this.triggerEvent('iframe:removed', { uuid });
        }
    }

    // Watch for dynamically added elements
    observeDOM() {
        if (!window.MutationObserver) return;
        
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        if (node.hasAttribute('data-smart-iframe')) {
                            this.createSmartIframe(node);
                        }
                        
                        // Check for simple iframe
                        if (node.classList?.contains('smartIframe') && node.hasAttribute('data-src')) {
                            this.createSimpleIframe(node);
                        }
                        
                        // Check child elements
                        const children = node.querySelectorAll?.('[data-smart-iframe]');
                        children?.forEach(child => {
                            if (!child.id) {
                                this.createSmartIframe(child);
                            }
                        });
                        
                        // Check for simple iframes
                        const simpleChildren = node.querySelectorAll?.('.smartIframe[data-src]');
                        simpleChildren?.forEach(child => {
                            if (!child.id) {
                                this.createSimpleIframe(child);
                            }
                        });
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Add required styles
    addStyles() {
        if (document.getElementById('smart-iframe-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'smart-iframe-styles';
        style.textContent = `
            .smart-iframe-container {
                width: 100%;
                position: relative;
                overflow: hidden;
            }
            
            .smart-iframe {
                border: none;
                width: 100%;
                height: 200px;
                display: block;
                transition: height 0.3s ease;
            }
            
            .smart-iframe.loading {
                opacity: 0.7;
            }
            
            .smart-iframe.error {
                border: 2px solid #ff6b6b;
                background: #ffe6e6;
            }
        `;
        
        document.head.appendChild(style);
    }

    // Generate unique ID
    generateUUID() {
        return 'iframe_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    // Public API
    getIframe(uuid) {
        return this.iframes.get(uuid);
    }

    getAllIframes() {
        return Array.from(this.iframes.entries()).map(([uuid, data]) => ({
            uuid,
            ...data
        }));
    }
}

// Initialize globally
window.SmartIframeLoader = SmartIframeLoader;

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    window.smartIframes = new SmartIframeLoader();
}

// Usage Examples:
/*
// HTML:
<div data-smart-iframe="https://example.com/form" 
     data-allow-resize="true" 
     data-allow-redirect="true"
     data-max-height="800"
     data-title="Contact Form">
</div>

// JavaScript:
window.smartIframes.on('iframe:ready', (data) => {
    // Handle iframe ready event
});

window.smartIframes.on('iframe:resize', (data) => {
    // Handle iframe resize event
});

window.smartIframes.on('iframe:redirect', (data) => {
    // Handle iframe redirect event
});
*/