/**
 * Smart Iframe Loader v2.0
 * Improved cross-origin support following Pipedrive's approach
 * - Never tries to access contentWindow.location directly
 * - Relies entirely on postMessage for cross-origin communication
 * - Falls back gracefully when helper script is not available
 */

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
            ERROR: 'error',
            URL_UPDATE: 'url_update',
            FORM_SUBMIT: 'form_submit',
            VALIDATION_ERROR: 'validation_error'
        };
        
        this.init();
    }

    init() {
        console.log('Smart Iframe v2: Initializing...');
        
        // Listen for messages from iframes
        window.addEventListener('message', this.handleMessage.bind(this));
        
        // Auto-detect and initialize iframes when DOM is ready
        if (document.readyState === 'loading') {
            console.log('Smart Iframe v2: DOM not ready, waiting for DOMContentLoaded');
            document.addEventListener('DOMContentLoaded', this.autoDetect.bind(this));
        } else {
            console.log('Smart Iframe v2: DOM ready, starting auto-detect immediately');
            this.autoDetect();
        }
        
        // Watch for dynamically added iframes
        this.observeDOM();
    }

    // Auto-detect iframes with special attributes
    autoDetect() {
        console.log('Smart Iframe v2: Starting auto-detection...');
        
        // Original method
        const elements = document.querySelectorAll('[data-smart-iframe]');
        console.log(`Smart Iframe v2: Found ${elements.length} elements with [data-smart-iframe]`);
        elements.forEach(element => {
            console.log('Smart Iframe v2: Checking element:', element, 'ID:', element.id);
            
            // Check if element already has an iframe child
            const existingIframe = element.querySelector('iframe');
            if (existingIframe) {
                console.log('Smart Iframe v2: Element already has iframe, skipping');
                return;
            }
            
            // Check if we already have this element in our iframes Map
            const hasExistingData = element.id && this.iframes.has(element.id);
            if (hasExistingData) {
                console.log('Smart Iframe v2: Element already processed, skipping');
                return;
            }
            
            console.log('Smart Iframe v2: Creating smart iframe for element');
            this.createSmartIframe(element);
        });
        
        // Simple method for non-developers
        const simpleElements = document.querySelectorAll('.smartIframe[data-src]');
        console.log(`Smart Iframe v2: Found ${simpleElements.length} elements with .smartIframe[data-src]`);
        simpleElements.forEach(element => {
            console.log('Smart Iframe v2: Checking simple element:', element, 'ID:', element.id);
            
            // Check if element already has an iframe child
            const existingIframe = element.querySelector('iframe');
            if (existingIframe) {
                console.log('Smart Iframe v2: Element already has iframe, skipping');
                return;
            }
            
            // Check if we already have this element in our iframes Map
            const hasExistingData = element.id && this.iframes.has(element.id);
            if (hasExistingData) {
                console.log('Smart Iframe v2: Element already processed, skipping');
                return;
            }
            
            console.log('Smart Iframe v2: Creating simple iframe for element');
            this.createSimpleIframe(element);
        });
        
        console.log('Smart Iframe v2: Auto-detection completed');
    }

    // Detect if URL is cross-origin
    isCrossOrigin(url) {
        try {
            const iframeUrl = new URL(url);
            const currentUrl = new URL(window.location.href);
            return iframeUrl.origin !== currentUrl.origin;
        } catch {
            return true; // Assume cross-origin if URL parsing fails
        }
    }

    // Create smart iframe
    createSmartIframe(container) {
        const config = this.parseConfig(container);
        const uuid = this.generateUUID();
        console.log(`Smart Iframe: Creating smart iframe with UUID: ${uuid}`);
        console.log(`Smart Iframe: Config src: ${config.src}`);
        const iframe = this.buildIframe(config, uuid);
        
        // Detect if cross-origin
        config.isCrossOrigin = this.isCrossOrigin(config.src);
        
        // Keep original container ID - don't overwrite it with UUID
        // Only set ID if the container doesn't already have one
        if (!container.id) {
            container.id = uuid;
        }
        container.appendChild(iframe);
        
        // Store iframe reference
        this.iframes.set(uuid, {
            container,
            iframe,
            config,
            isReady: false,
            isCrossOrigin: config.isCrossOrigin,
            lastKnownUrl: config.src,
            messageReceived: false
        });
        
        // Add styles
        this.addStyles();
        
        // Send initial config when iframe loads
        iframe.addEventListener('load', () => {
            this.handleIframeLoad(uuid);
        });
        
        return uuid;
    }

    // Create simple iframe for non-developers
    createSimpleIframe(container) {
        const dataset = container.dataset;
        console.log(`Smart Iframe: Creating simple iframe from container:`, container);
        
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
            title: dataset.title || 'Smart Iframe',
            validationDetection: dataset.validationDetection || 'auto',
            successPatterns: dataset.successPatterns ? dataset.successPatterns.split(',') : ['/success', '/thank', '/complete', '/done'],
            errorPatterns: dataset.errorPatterns ? dataset.errorPatterns.split(',') : ['same-url', '/error', '/invalid'],
            confirmOnUncertain: dataset.confirmOnUncertain !== 'false',
            debugMode: dataset.debugMode === 'true' || dataset.validationDetection === 'debug',
            laravelMode: dataset.laravelMode === 'true',
            errorParams: dataset.errorParams ? dataset.errorParams.split(',') : ['validation_status=error', 'errors=1', 'error=1'],
            successParams: dataset.successParams ? dataset.successParams.split(',') : ['status=success', 'success=1'],
            validationTiming: parseInt(dataset.validationTiming) || 500,
            crossOrigin: dataset.crossOrigin === 'true'
        };
        
        const uuid = this.generateUUID();
        console.log(`Smart Iframe: Generated UUID for simple iframe: ${uuid}`);
        console.log(`Smart Iframe: Simple iframe src: ${config.src}`);
        const iframe = this.buildIframe(config, uuid);
        
        // Detect if cross-origin
        config.isCrossOrigin = this.isCrossOrigin(config.src);
        
        // Keep original container ID - don't overwrite it with UUID
        // Only set ID if the container doesn't already have one
        if (!container.id) {
            container.id = uuid;
        }
        container.appendChild(iframe);
        
        // Store iframe reference
        this.iframes.set(uuid, {
            container,
            iframe,
            config,
            isReady: false,
            isCrossOrigin: config.isCrossOrigin,
            lastKnownUrl: config.src,
            messageReceived: false
        });
        
        // Add styles
        this.addStyles();
        
        // Send initial config when iframe loads
        iframe.addEventListener('load', () => {
            this.handleIframeLoad(uuid);
        });
        
        return uuid;
    }

    // Handle iframe load event
    handleIframeLoad(uuid) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { config, iframe, isCrossOrigin } = iframeData;
        
        // Send configuration to iframe
        this.sendConfig(uuid, config);
        
        // For same-origin, we can try direct access
        if (!isCrossOrigin) {
            this.tryDirectAccess(uuid);
        } else {
            // For cross-origin, rely on postMessage
            console.log(`Smart Iframe: Cross-origin detected for ${uuid}. Waiting for postMessage communication...`);
            
            // Set up fallback mechanisms
            this.setupCrossOriginFallback(uuid);
        }
        
        // Try auto-resize (will work for same-origin, fallback for cross-origin)
        this.tryAutoResize(uuid, config);
        
        // Set ready state with fallback
        this.setReadyWithFallback(uuid);
    }

    // Try direct access for same-origin iframes
    tryDirectAccess(uuid) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { iframe } = iframeData;
        
        try {
            // Try to access contentWindow.location (will only work for same-origin)
            const currentUrl = iframe.contentWindow.location.href;
            iframeData.lastKnownUrl = currentUrl;
            
            // Set up monitoring for same-origin
            this.setupSameOriginMonitoring(uuid);
        } catch (e) {
            // If we can't access, treat as cross-origin
            console.log(`Smart Iframe: Cannot access iframe URL for ${uuid}. Treating as cross-origin.`);
            iframeData.isCrossOrigin = true;
            this.setupCrossOriginFallback(uuid);
        }
    }

    // Setup monitoring for same-origin iframes
    setupSameOriginMonitoring(uuid) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { iframe, config } = iframeData;
        
        // Monitor URL changes
        let lastUrl = iframeData.lastKnownUrl;
        const checkInterval = setInterval(() => {
            try {
                const currentUrl = iframe.contentWindow.location.href;
                if (currentUrl !== lastUrl) {
                    this.handleUrlChange(uuid, currentUrl, lastUrl);
                    lastUrl = currentUrl;
                    iframeData.lastKnownUrl = currentUrl;
                }
            } catch (e) {
                // Lost access, switch to cross-origin mode
                clearInterval(checkInterval);
                iframeData.isCrossOrigin = true;
                this.setupCrossOriginFallback(uuid);
            }
        }, 500);
        
        iframeData.monitoringInterval = checkInterval;
    }

    // Setup fallback for cross-origin iframes
    setupCrossOriginFallback(uuid) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { iframe, config } = iframeData;
        
        // Wait for postMessage communication
        setTimeout(() => {
            if (!iframeData.messageReceived) {
                console.warn(`Smart Iframe: No postMessage received from ${uuid}. Helper script may not be installed.`);
                
                if (config.debugMode) {
                    this.showDebugInfo(uuid, {
                        status: 'No Communication',
                        reason: 'iframe-injector.js not detected',
                        suggestion: 'Add iframe-injector.js to iframe page for full functionality',
                        fallbackMode: 'limited'
                    });
                }
                
                // Setup limited fallback functionality
                this.setupLimitedFallback(uuid);
            }
        }, 3000);
    }

    // Setup limited functionality for iframes without helper script
    setupLimitedFallback(uuid) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { iframe, config } = iframeData;
        
        // Can only detect load events and count them
        let loadCount = 0;
        iframe.addEventListener('load', () => {
            loadCount++;
            if (loadCount > 1) {
                // Probably a navigation or form submission
                this.triggerEvent('iframe:possible-navigation', {
                    uuid,
                    loadCount,
                    timestamp: Date.now()
                });
                
                if (config.allowRedirect && loadCount > 2) {
                    // High confidence of successful form submission
                    const redirectUrl = this.extractRedirectUrl(iframe.src);
                    if (redirectUrl) {
                        this.handleDetectedRedirect(uuid, redirectUrl);
                    }
                }
            }
        });
        
        // Progressive resize fallback
        if (config.allowResize) {
            this.setupProgressiveResize(uuid, config);
        }
    }

    // Parse configuration from container element
    parseConfig(container) {
        const dataset = container.dataset;
        
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
            title: dataset.title || 'Smart Iframe',
            validationDetection: dataset.validationDetection || 'auto',
            successPatterns: dataset.successPatterns ? dataset.successPatterns.split(',') : ['/success', '/thank', '/complete', '/done'],
            errorPatterns: dataset.errorPatterns ? dataset.errorPatterns.split(',') : ['same-url', '/error', '/invalid'],
            confirmOnUncertain: dataset.confirmOnUncertain !== 'false',
            debugMode: dataset.debugMode === 'true' || dataset.validationDetection === 'debug',
            laravelMode: dataset.laravelMode === 'true',
            errorParams: dataset.errorParams ? dataset.errorParams.split(',') : ['validation_status=error', 'errors=1', 'error=1'],
            successParams: dataset.successParams ? dataset.successParams.split(',') : ['status=success', 'success=1'],
            validationTiming: parseInt(dataset.validationTiming) || 500,
            crossOrigin: dataset.crossOrigin === 'true'
        };
    }

    // Build iframe element
    buildIframe(config, uuid) {
        const iframe = document.createElement('iframe');
        
        // Add UUID to URL for tracking
        let src = config.src;
        if (uuid) {
            const separator = src.includes('?') ? '&' : '?';
            src += `${separator}uuid=${uuid}`;
            console.log(`Smart Iframe: Building iframe with UUID: ${uuid}, final URL: ${src}`);
        } else {
            console.warn('Smart Iframe: No UUID provided to buildIframe');
        }
        
        iframe.src = src;
        iframe.scrolling = config.scrolling;
        iframe.title = config.title;
        iframe.className = 'smart-iframe';
        
        if (config.sandbox) {
            // Add allow-top-navigation-by-user-activation if redirect is allowed
            // This enables the iframe to redirect the parent page when triggered by user interaction
            let sandboxValue = config.sandbox;
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

    // Send configuration to iframe
    sendConfig(uuid, config) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const message = {
            type: this.messageTypes.CONFIG,
            uuid: uuid,
            config: {
                parentUrl: window.location.href,
                allowResize: config.allowResize,
                allowRedirect: config.allowRedirect,
                allowEvents: config.allowEvents
            }
        };
        
        // Send to iframe (will work if helper script is present)
        iframeData.iframe.contentWindow?.postMessage(message, '*');
    }

    // Handle messages from iframes
    handleMessage(event) {
        // Validate message structure
        if (!event.data || !event.data.type || !event.data.uuid) {
            return;
        }
        
        const { type, uuid } = event.data;
        const iframeData = this.iframes.get(uuid);
        
        if (!iframeData) {
            return;
        }
        
        // Mark that we've received a message from this iframe
        iframeData.messageReceived = true;
        
        // Handle different message types
        switch (type) {
            case 'IFRAME_URL_UPDATE':
                this.handleUrlUpdateMessage(uuid, event.data);
                break;
                
            case 'FORM_SUBMIT':
                this.handleFormSubmitMessage(uuid, event.data);
                break;
                
            case 'VALIDATION_ERROR_DETECTED':
                this.handleValidationErrorMessage(uuid, event.data);
                break;
                
            case this.messageTypes.RESIZE:
                this.handleResizeMessage(uuid, event.data.payload);
                break;
                
            case this.messageTypes.REDIRECT:
                this.handleRedirectMessage(uuid, event.data.payload);
                break;
                
            case this.messageTypes.READY:
                this.handleReadyMessage(uuid);
                break;
                
            case this.messageTypes.EVENT:
                this.handleEventMessage(uuid, event.data.payload);
                break;
        }
    }

    // Handle URL update message from iframe
    handleUrlUpdateMessage(uuid, data) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { url, pathname, search } = data;
        const oldUrl = iframeData.lastKnownUrl;
        
        iframeData.lastKnownUrl = url;
        
        this.triggerEvent('iframe:url-update', {
            uuid,
            url,
            pathname,
            search,
            oldUrl,
            timestamp: data.timestamp
        });
        
        // Check for validation errors if Laravel mode
        if (iframeData.config.laravelMode) {
            this.checkLaravelValidation(uuid, url);
        }
    }

    // Handle form submit message from iframe
    handleFormSubmitMessage(uuid, data) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        iframeData.formSubmitted = true;
        iframeData.formSubmitTime = data.timestamp;
        
        this.triggerEvent('iframe:form-submit', {
            uuid,
            formId: data.formId,
            method: data.method,
            action: data.action,
            timestamp: data.timestamp
        });
    }

    // Handle validation error message from iframe
    handleValidationErrorMessage(uuid, data) {
        this.triggerEvent('iframe:validation-error', {
            uuid,
            url: data.url,
            hasErrors: data.hasErrors,
            timestamp: data.timestamp
        });
    }

    // Handle resize message
    handleResizeMessage(uuid, payload) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData || !iframeData.config.allowResize) return;
        
        const { height, width } = payload;
        const { iframe, config } = iframeData;
        
        if (height) {
            let finalHeight = Math.max(height, config.minHeight);
            if (config.maxHeight) {
                finalHeight = Math.min(finalHeight, config.maxHeight);
            }
            iframe.style.height = `${finalHeight}px`;
        }
        
        if (width) {
            iframe.style.width = `${width}px`;
        }
        
        this.triggerEvent('iframe:resize', { uuid, height, width });
    }

    // Handle redirect message
    handleRedirectMessage(uuid, payload) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData || !iframeData.config.allowRedirect) return;
        
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

    // Handle ready message
    handleReadyMessage(uuid) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        iframeData.isReady = true;
        this.triggerEvent('iframe:ready', { uuid });
    }

    // Handle event message
    handleEventMessage(uuid, payload) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData || !iframeData.config.allowEvents) return;
        
        const { eventName, data } = payload;
        this.triggerEvent(`iframe:${eventName}`, { uuid, data });
    }

    // Handle URL change (for same-origin iframes)
    handleUrlChange(uuid, newUrl, oldUrl) {
        this.triggerEvent('iframe:url-change', {
            uuid,
            newUrl,
            oldUrl,
            timestamp: Date.now()
        });
        
        const iframeData = this.iframes.get(uuid);
        if (iframeData && iframeData.config.laravelMode) {
            this.checkLaravelValidation(uuid, newUrl);
        }
    }

    // Check for Laravel validation errors
    checkLaravelValidation(uuid, url) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { config } = iframeData;
        
        try {
            const urlObj = new URL(url);
            const params = urlObj.searchParams;
            
            // Check for error parameters
            for (const errorParam of config.errorParams) {
                if (errorParam.includes('=')) {
                    const [key, value] = errorParam.split('=');
                    if (params.get(key) === value) {
                        this.triggerEvent('iframe:validation-error', {
                            uuid,
                            url,
                            errorParam,
                            timestamp: Date.now()
                        });
                        return;
                    }
                } else {
                    if (params.has(errorParam)) {
                        this.triggerEvent('iframe:validation-error', {
                            uuid,
                            url,
                            errorParam,
                            timestamp: Date.now()
                        });
                        return;
                    }
                }
            }
            
            // Check for success parameters
            for (const successParam of config.successParams) {
                if (successParam.includes('=')) {
                    const [key, value] = successParam.split('=');
                    if (params.get(key) === value) {
                        this.triggerEvent('iframe:form-success', {
                            uuid,
                            url,
                            successParam,
                            timestamp: Date.now()
                        });
                        return;
                    }
                } else {
                    if (params.has(successParam)) {
                        this.triggerEvent('iframe:form-success', {
                            uuid,
                            url,
                            successParam,
                            timestamp: Date.now()
                        });
                        return;
                    }
                }
            }
        } catch (e) {
            console.error('Error checking Laravel validation:', e);
        }
    }

    // Handle detected redirect
    handleDetectedRedirect(uuid, redirectUrl) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData || !iframeData.config.allowRedirect) return;
        
        if (this.isValidUrl(redirectUrl)) {
            window.location.href = redirectUrl;
            this.triggerEvent('iframe:redirect', {
                uuid,
                url: redirectUrl,
                detected: true,
                timestamp: Date.now()
            });
        }
    }

    // Try auto-resize
    tryAutoResize(uuid, config) {
        if (!config.allowResize) return;
        
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { iframe, isCrossOrigin } = iframeData;
        
        if (!isCrossOrigin) {
            // For same-origin, we can directly access the content
            try {
                const height = iframe.contentDocument?.body?.scrollHeight;
                if (height && height > config.initialHeight) {
                    let finalHeight = Math.max(height, config.minHeight);
                    if (config.maxHeight) {
                        finalHeight = Math.min(finalHeight, config.maxHeight);
                    }
                    iframe.style.height = `${finalHeight}px`;
                    this.triggerEvent('iframe:resize', {
                        uuid,
                        height: finalHeight,
                        auto: true
                    });
                }
            } catch (e) {
                // If we can't access, fall back to progressive resize
                this.setupProgressiveResize(uuid, config);
            }
        } else {
            // For cross-origin, use progressive resize
            this.setupProgressiveResize(uuid, config);
        }
    }

    // Setup progressive resize for cross-origin iframes
    setupProgressiveResize(uuid, config) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        const { iframe } = iframeData;
        let currentHeight = config.initialHeight;
        const maxHeight = config.maxHeight || Math.min(window.innerHeight * 0.8, 1200);
        let attempts = 0;
        
        const increaseHeight = () => {
            if (attempts >= 20) return;
            
            attempts++;
            currentHeight = Math.min(currentHeight + 100, maxHeight);
            iframe.style.height = `${currentHeight}px`;
            
            this.triggerEvent('iframe:resize', {
                uuid,
                height: currentHeight,
                auto: true,
                method: 'progressive'
            });
            
            if (currentHeight < maxHeight) {
                setTimeout(increaseHeight, 1500);
            }
        };
        
        setTimeout(increaseHeight, 2000);
    }

    // Set ready with fallback
    setReadyWithFallback(uuid) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        setTimeout(() => {
            if (!iframeData.isReady) {
                iframeData.isReady = true;
                this.triggerEvent('iframe:ready', { uuid, fallback: true });
            }
        }, 3000);
    }

    // Extract redirect URL from parameters
    extractRedirectUrl(url) {
        try {
            const urlObj = new URL(url);
            const redirectParam = urlObj.searchParams.get('p') || 
                                urlObj.searchParams.get('redirect') || 
                                urlObj.searchParams.get('return');
            
            return redirectParam ? decodeURIComponent(redirectParam) : null;
        } catch {
            return null;
        }
    }

    // Show debug information
    showDebugInfo(uuid, info) {
        const message = [
            '🔍 Smart Iframe Debug Info',
            `UUID: ${uuid}`,
            `Status: ${info.status}`,
            `Reason: ${info.reason}`,
            info.suggestion ? `💡 Suggestion: ${info.suggestion}` : '',
            info.fallbackMode ? `Mode: ${info.fallbackMode}` : ''
        ].filter(Boolean).join('\n');
        
        console.log(message);
        
        if (confirm(message + '\n\nShow documentation?')) {
            window.open('https://github.com/your-repo/smart-iframe/blob/main/CROSS-ORIGIN-SETUP.md', '_blank');
        }
    }

    // Check if URL is valid
    isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    }

    // Event management
    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }
        this.events.get(eventName).add(callback);
        
        // Return unsubscribe function
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

    // Send message to iframe
    sendToIframe(uuid, type, payload) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return false;
        
        const message = {
            type: type,
            uuid: uuid,
            payload: payload
        };
        
        iframeData.iframe.contentWindow?.postMessage(message, '*');
        return true;
    }

    // Remove iframe
    removeIframe(uuid) {
        const iframeData = this.iframes.get(uuid);
        if (iframeData) {
            if (iframeData.monitoringInterval) {
                clearInterval(iframeData.monitoringInterval);
            }
            iframeData.container.removeChild(iframeData.iframe);
            this.iframes.delete(uuid);
            this.triggerEvent('iframe:removed', { uuid });
        }
    }

    // Observe DOM for new iframes
    observeDOM() {
        if (!window.MutationObserver) return;
        
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        // Check if it's a smart iframe
                        if (node.hasAttribute('data-smart-iframe')) {
                            this.createSmartIframe(node);
                        }
                        
                        if (node.classList?.contains('smartIframe') && node.hasAttribute('data-src')) {
                            this.createSimpleIframe(node);
                        }
                        
                        // Check children
                        const smartElements = node.querySelectorAll?.('[data-smart-iframe]');
                        smartElements?.forEach(element => {
                            if (!element.id) {
                                this.createSmartIframe(element);
                            }
                        });
                        
                        const simpleElements = node.querySelectorAll?.('.smartIframe[data-src]');
                        simpleElements?.forEach(element => {
                            if (!element.id) {
                                this.createSimpleIframe(element);
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

    // Add styles
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

    // Generate UUID
    generateUUID() {
        return 'iframe_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    }

    // Get iframe by UUID or element ID
    getIframe(identifier) {
        // First try to get by UUID directly
        if (this.iframes.has(identifier)) {
            return this.iframes.get(identifier);
        }
        
        // If not found, search by container element ID
        for (const [uuid, data] of this.iframes.entries()) {
            if (data.container && data.container.id === identifier) {
                return data;
            }
        }
        
        return null;
    }

    // Get all iframes
    getAllIframes() {
        return Array.from(this.iframes.entries()).map(([uuid, data]) => ({
            uuid,
            ...data
        }));
    }

    // Send message to iframe
    sendToIframe(identifier, type, data) {
        const iframeData = this.getIframe(identifier);
        if (!iframeData || !iframeData.iframe) {
            if (this.debugMode) {
                console.log('Smart Iframe: Cannot send message - iframe not found:', identifier);
            }
            return false;
        }

        try {
            const message = {
                type: type,
                data: data,
                uuid: iframeData.uuid,
                timestamp: Date.now()
            };
            
            iframeData.iframe.contentWindow.postMessage(message, '*');
            
            if (this.debugMode) {
                console.log('Smart Iframe: Message sent to iframe:', identifier, message);
            }
            return true;
        } catch (error) {
            if (this.debugMode) {
                console.log('Smart Iframe: Failed to send message:', error);
            }
            return false;
        }
    }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    window.SmartIframeLoader = SmartIframeLoader;
    window.smartIframes = new SmartIframeLoader();
}