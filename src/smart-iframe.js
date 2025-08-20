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
        const uuid = this.generateUUID();
        const iframe = this.buildIframe(config, uuid);
        
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
            title: dataset.title || 'Smart Iframe',
            
            // Validation Detection Options
            validationDetection: dataset.validationDetection || 'auto', // auto, strict, loose, off, debug
            successPatterns: dataset.successPatterns ? dataset.successPatterns.split(',') : ['/success', '/thank', '/complete', '/done'],
            errorPatterns: dataset.errorPatterns ? dataset.errorPatterns.split(',') : ['same-url', '/error', '/invalid'],
            confirmOnUncertain: dataset.confirmOnUncertain !== 'false', // show dialog when uncertain
            debugMode: dataset.debugMode === 'true' || dataset.validationDetection === 'debug', // detailed logging and confirmation
            
            // Laravel-specific Options
            laravelMode: dataset.laravelMode === 'true', // enable Laravel-specific detection
            errorParams: dataset.errorParams ? dataset.errorParams.split(',') : ['validation_status=error', 'errors=1', 'error=1'],
            successParams: dataset.successParams ? dataset.successParams.split(',') : ['status=success', 'success=1'],
            validationTiming: parseInt(dataset.validationTiming) || 500 // threshold for timing analysis (ms)
        };
        
        const uuid = this.generateUUID();
        const iframe = this.buildIframe(config, uuid);
        
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
        const config = {
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
            
            // Validation Detection Options
            validationDetection: dataset.validationDetection || 'auto', // auto, strict, loose, off, debug
            successPatterns: dataset.successPatterns ? dataset.successPatterns.split(',') : ['/success', '/thank', '/complete', '/done'],
            errorPatterns: dataset.errorPatterns ? dataset.errorPatterns.split(',') : ['same-url', '/error', '/invalid'],
            confirmOnUncertain: dataset.confirmOnUncertain !== 'false', // show dialog when uncertain
            debugMode: dataset.debugMode === 'true' || dataset.validationDetection === 'debug', // detailed logging and confirmation
            
            // Laravel-specific Options
            laravelMode: dataset.laravelMode === 'true', // enable Laravel-specific detection
            errorParams: dataset.errorParams ? dataset.errorParams.split(',') : ['validation_status=error', 'errors=1', 'error=1'],
            successParams: dataset.successParams ? dataset.successParams.split(',') : ['status=success', 'success=1'],
            validationTiming: parseInt(dataset.validationTiming) || 500 // threshold for timing analysis (ms)
        };
        
        
        return config;
    }

    // Build iframe element
    buildIframe(config, uuid) {
        const iframe = document.createElement('iframe');
        
        // Add UUID to iframe src for postMessage communication
        let iframeSrc = config.src;
        if (uuid) {
            const separator = iframeSrc.includes('?') ? '&' : '?';
            iframeSrc += `${separator}uuid=${uuid}`;
        }
        
        iframe.src = iframeSrc;
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
            lastActivity: Date.now(),
            formSubmitted: false,
            initialPath: this.extractPath(originalSrc)
        };
        
        
        // Method 1: Listen for navigation events
        this.setupNavigationDetection(uuid);
        
        // Method 2: Monitor iframe load events (for redirects)
        this.setupLoadEventMonitoring(uuid);
        
        // Method 3: Performance observer for navigation timing
        this.setupPerformanceMonitoring(uuid);
        
        // Method 4: Monitor form submissions
        this.setupFormSubmissionMonitoring(uuid);
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
            
            // Check if this is after form submission
            if (iframeData.monitoring.formSubmitted) {
                // Calculate time since form submission
                const timeSinceSubmit = Date.now() - iframeData.monitoring.formSubmitTime;
                
                // Try to get current URL from iframe (may fail for cross-origin)
                let currentUrl;
                let canAccessUrl = false;
                try {
                    currentUrl = iframe.contentWindow.location.href;
                    canAccessUrl = true;
                } catch {
                    // Cross-origin - can't access URL, use iframe.src as fallback
                    currentUrl = iframe.src || iframeData.monitoring.originalSrc;
                    canAccessUrl = false;
                    
                    // For Laravel mode, try iframe.src which might have updated URL
                    if (config.laravelMode && iframe.src && iframe.src !== iframeData.monitoring.originalSrc) {
                        canAccessUrl = true; // Allow Laravel detection to work
                        console.log('Laravel mode: Using iframe.src as URL fallback:', iframe.src);
                    }
                }
                
                // Determine if form submission was successful
                let isSuccessful;
                if (canAccessUrl) {
                    // Same-origin: can check URL path and patterns
                    const currentPath = this.extractPath(currentUrl);
                    isSuccessful = this.detectFormSubmissionSuccess(uuid, currentPath, currentUrl);
                } else {
                    // Cross-origin: use load event counter and configuration
                    const config = iframeData.config;
                    
                    if (config.validationDetection === 'off') {
                        isSuccessful = true; // Always redirect if detection is off
                    } else if (config.laravelMode) {
                        // Laravel mode: use timing analysis as primary method for cross-origin
                        isSuccessful = this.detectLaravelTimingSuccess(timeSinceSubmit, config);
                    } else if (config.validationDetection === 'strict') {
                        // Strict mode: only redirect on multiple loads (redirect chain)
                        isSuccessful = iframeData.monitoring.redirectCount > 1;
                    } else if (config.validationDetection === 'loose') {
                        // Loose mode: redirect unless very quick reload
                        isSuccessful = timeSinceSubmit > 500;
                    } else if (config.validationDetection === 'debug') {
                        // Debug mode: use auto logic but show debug info
                        isSuccessful = iframeData.monitoring.redirectCount > 1;
                    } else {
                        // Auto mode: use load count heuristic
                        isSuccessful = iframeData.monitoring.redirectCount > 1;
                    }
                }
                
                this.triggerEvent('iframe:form-result', { 
                    uuid, 
                    success: isSuccessful,
                    redirectCount: iframeData.monitoring.redirectCount,
                    timestamp: Date.now(),
                    timeSinceSubmit,
                    canAccessUrl,
                    method: canAccessUrl ? 'url-comparison' : 'timing-heuristic'
                });
                
                // Delay reset form submission flag to allow other handlers to see it
                setTimeout(() => {
                    if (iframeData.monitoring) {
                        console.log('🔄 Resetting formSubmitted flag after delay');
                        iframeData.monitoring.formSubmitted = false;
                        // Keep expectedResult for a bit longer for Laravel detection
                        if (iframeData.monitoring.expectedResult) {
                            setTimeout(() => {
                                if (iframeData.monitoring) {
                                    console.log('🔄 Clearing stored expected result');
                                    delete iframeData.monitoring.expectedResult;
                                    delete iframeData.monitoring.expectedParams;
                                }
                            }, 1000); // Keep expected result longer
                        }
                    }
                }, 500); // Give other handlers time to process
                
                const config = iframeData.config;
                const redirectUrl = this.extractRedirectUrl(currentUrl);
                
                // Handle debug mode
                if (config.debugMode || config.validationDetection === 'debug') {
                    const debugData = {
                        success: isSuccessful,
                        method: canAccessUrl ? 'url-analysis' : (config.laravelMode ? 'laravel-timing' : 'load-count-heuristic'),
                        timeSinceSubmit,
                        redirectCount: iframeData.monitoring.redirectCount,
                        canAccessUrl,
                        currentPath: canAccessUrl ? this.extractPath(currentUrl) : 'cross-origin',
                        initialPath: iframeData.monitoring.initialPath,
                        redirectUrl: redirectUrl || 'form-success-redirect',
                        reason: canAccessUrl ? 'url-comparison' : `load-count: ${iframeData.monitoring.redirectCount}`,
                        laravelMode: config.laravelMode,
                        urlParams: config.laravelMode && currentUrl ? new URL(currentUrl).search : null,
                        laravelResult: config.laravelMode && currentUrl ? this.detectLaravelFormResult(currentUrl, config) : null,
                        laravelTiming: config.laravelMode && !canAccessUrl ? this.detectLaravelTimingSuccess(timeSinceSubmit, config) : null
                    };
                    
                    this.triggerEvent('iframe:debug-info', { 
                        uuid, 
                        debugData,
                        timestamp: Date.now()
                    });
                    
                    // Always show debug dialog in debug mode
                    this.showDebugDialog(uuid, debugData).then((confirmed) => {
                        if (confirmed) {
                            if (isSuccessful) {
                                this.performRedirect(uuid, redirectUrl || 'form-success-redirect');
                            } else {
                                console.log('Debug: User chose not to redirect (validation error detected)');
                            }
                        } else {
                            // User overrode the decision
                            if (isSuccessful) {
                                console.log('Debug: User cancelled successful redirect');
                            } else {
                                console.log('Debug: User cancelled validation error handling');
                            }
                        }
                    });
                } else {
                    // Normal mode handling
                    if (isSuccessful) {
                        // Form submission was successful
                        this.handleDetectedRedirect(uuid, redirectUrl || 'form-success-redirect', currentUrl);
                    } else {
                        // Form submission failed (validation error)
                        this.triggerEvent('iframe:form-validation-error', { 
                            uuid, 
                            timestamp: Date.now(),
                            timeSinceSubmit,
                            reason: canAccessUrl ? 'pattern-match' : 'load-count',
                            method: canAccessUrl ? 'url-analysis' : 'heuristic'
                        });
                        
                        // Show confirmation dialog if configured and uncertain
                        if (config.confirmOnUncertain && !canAccessUrl && config.validationDetection === 'auto') {
                            if (redirectUrl) {
                                this.showValidationConfirmDialog(uuid, redirectUrl).then((confirmed) => {
                                    if (confirmed) {
                                        this.handleDetectedRedirect(uuid, redirectUrl, currentUrl);
                                    }
                                });
                            }
                        }
                        // Otherwise, don't redirect for validation errors
                    }
                }
            } else {
                // Regular navigation detection
                this.triggerEvent('iframe:navigation-detected', { 
                    uuid, 
                    timestamp: Date.now(),
                    redirectCount: iframeData.monitoring.redirectCount
                });
                
                // Try to get redirect URL from query parameter
                const redirectUrl = this.extractRedirectUrl(iframeData.monitoring.originalSrc);
                this.handleDetectedRedirect(uuid, redirectUrl || 'cross-origin-navigation', iframeData.monitoring.originalSrc);
            }
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
                // Try to get the current URL to detect what happened
                let currentUrl = 'cross-origin-navigation';
                try {
                    currentUrl = iframe.contentWindow.location.href;
                } catch (e) {
                    // Cross-origin access denied - try iframe.src as fallback
                    if (iframe.src && iframe.src !== iframeData.monitoring.originalSrc) {
                        currentUrl = iframe.src;
                    }
                }
                
                // Use handleDetectedRedirect to properly validate the navigation
                this.handleDetectedRedirect(uuid, currentUrl, iframeData.monitoring.originalSrc);
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
    
    // Extract path from URL
    extractPath(urlString) {
        try {
            const url = new URL(urlString);
            return url.pathname + url.search;
        } catch {
            return urlString;
        }
    }
    
    // Setup form submission monitoring
    setupFormSubmissionMonitoring(uuid) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return;
        
        // Listen for message from iframe about form submission
        // This requires cooperation from iframe content if same-origin
        // For cross-origin, we rely on load event detection
    }
    
    // Detect if form submission was successful
    detectFormSubmissionSuccess(uuid, currentPath, currentUrl) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData) return false;
        
        const config = iframeData.config;
        const initialPath = iframeData.monitoring.initialPath;
        
        // Check validation detection mode
        if (config.validationDetection === 'off') {
            return true; // Always treat as success if detection is off
        }
        
        // Laravel-specific detection
        if (config.laravelMode && currentUrl) {
            const laravelResult = this.detectLaravelFormResult(currentUrl, config);
            if (laravelResult !== null) {
                return laravelResult; // Use Laravel-specific result if available
            }
        }
        
        // Check against success patterns
        const successPatterns = config.successPatterns || [];
        for (const pattern of successPatterns) {
            if (pattern === 'path-change') {
                if (currentPath !== initialPath) return true;
            } else if (currentUrl && currentUrl.includes(pattern)) {
                return true;
            }
        }
        
        // Check against error patterns  
        const errorPatterns = config.errorPatterns || [];
        for (const pattern of errorPatterns) {
            if (pattern === 'same-url' || pattern === 'same-path') {
                if (currentPath === initialPath) return false;
            } else if (currentUrl && currentUrl.includes(pattern)) {
                return false;
            }
        }
        
        // Default behavior: If path changed, form submission was likely successful
        // If path stayed the same, likely validation error
        return currentPath !== initialPath;
    }
    
    // Laravel-specific form result detection
    detectLaravelFormResult(currentUrl, config) {
        try {
            const url = new URL(currentUrl);
            const params = url.searchParams;
            const urlString = url.toString();
            
            
            // Check for error parameters
            const errorParams = config.errorParams || [];
            for (const errorParam of errorParams) {
                if (errorParam.includes('=')) {
                    // Key-value parameter like "errors=1"
                    const [key, value] = errorParam.split('=');
                    const paramValue = params.get(key);
                    if (paramValue === value) {
                        return false; // Validation error detected
                    }
                } else {
                    // Simple parameter existence like "errors"
                    const hasParam = params.has(errorParam);
                    const includesParam = urlString.includes(`${errorParam}=`);
                    if (hasParam || includesParam) {
                        return false; // Validation error detected
                    }
                }
            }
            
            // Check for success parameters
            const successParams = config.successParams || [];
            for (const successParam of successParams) {
                if (successParam.includes('=')) {
                    // Key-value parameter like "status=success"
                    const [key, value] = successParam.split('=');
                    if (params.get(key) === value) {
                        return true; // Success detected
                    }
                } else {
                    // Simple parameter existence like "success"
                    if (params.has(successParam) || urlString.includes(`${successParam}=`)) {
                        return true; // Success detected
                    }
                }
            }
            
            return null; // No Laravel-specific indicators found
        } catch {
            return null; // URL parsing failed
        }
    }
    
    // Laravel timing-based detection for cross-origin iframes
    detectLaravelTimingSuccess(timeSinceSubmit, config) {
        const threshold = config.validationTiming || 500; // Default 500ms
        
        // Laravel validation errors are typically very fast (< 500ms)
        // because they just redirect back with validation errors
        // Success submissions often take longer due to:
        // - Database operations
        // - Email sending
        // - File processing
        // - Additional business logic
        
        if (timeSinceSubmit < threshold) {
            // Very quick response - likely validation error
            return false;
        } else {
            // Slower response - likely successful processing
            return true;
        }
    }
    
    // Show confirmation dialog when validation detection is uncertain
    showValidationConfirmDialog(uuid, redirectUrl) {
        return new Promise((resolve) => {
            if (!confirm(`Form submitted. Redirect to ${redirectUrl || 'success page'}?`)) {
                resolve(false);
                return;
            }
            resolve(true);
        });
    }
    
    // Show detailed debug dialog with detection information
    showDebugDialog(uuid, detectionData) {
        const {
            success,
            method,
            timeSinceSubmit,
            redirectCount,
            canAccessUrl,
            currentPath,
            initialPath,
            redirectUrl,
            reason,
            laravelMode,
            urlParams,
            laravelResult,
            laravelTiming,
            checkedUrl
        } = detectionData;
        
        const debugInfo = [
            `🔍 Debug Information:`,
            ``,
            `Detection Method: ${method}`,
            `Form Success: ${success ? 'YES' : 'NO'}`,
            `Reason: ${reason}`,
            ``,
            `⏱️ Timing:`,
            `Time Since Submit: ${timeSinceSubmit}ms`,
            `Load Count: ${redirectCount}`,
            ``,
            `🌐 URL Access:`,
            `Can Access URL: ${canAccessUrl ? 'YES' : 'NO'}`,
            canAccessUrl ? `Initial Path: ${initialPath}` : `Cross-origin iframe detected`,
            canAccessUrl ? `Current Path: ${currentPath}` : `Using load event heuristics`,
            ``
        ];
        
        // Add Laravel-specific debug information
        if (laravelMode) {
            debugInfo.push(
                `🚀 Laravel Detection:`,
                `Laravel Mode: ENABLED`,
                `URL Parameters: ${urlParams || 'none found'}`,
                `Checked URL: ${checkedUrl || 'unknown'}`,
                `Laravel URL Result: ${laravelResult || 'no match'}`,
                `Laravel Timing Result: ${laravelTiming || 'not applicable'}`,
                ``
            );
        }
        
        debugInfo.push(
            `🎯 Redirect:`,
            `Target URL: ${redirectUrl || 'N/A'}`,
            ``,
            success ? `✅ WILL REDIRECT` : `❌ WON'T REDIRECT`,
            ``,
            `Continue with this decision?`
        );
        
        return new Promise((resolve) => {
            // Log debug info to console for easy copying
            console.group('🔍 Smart Iframe Debug Information (Copy-friendly)');
            console.log(debugInfo.join('\n'));
            console.groupEnd();
            
            // Show dialog with additional copy instruction
            const dialogText = debugInfo.join('\n') + '\n\n💡 Tip: Debug info has been logged to browser console for easy copying (F12 → Console)';
            const confirmed = confirm(dialogText);
            resolve(confirmed);
        });
    }

    // Handle detected redirect (without postMessage)
    handleDetectedRedirect(uuid, newUrl, oldUrl) {
        
        const iframeData = this.iframes.get(uuid);
        
        const config = iframeData.config;
        
        
        if (!iframeData?.config.allowRedirect) {
            return;
        }
        
        // Always trigger redirect event for logging
        this.triggerEvent('iframe:redirect-detected', { 
            uuid, 
            newUrl, 
            oldUrl,
            redirectCount: iframeData.monitoring?.redirectCount || 0
        });
        
        // Handle Laravel mode validation detection for strict mode
        if (config.laravelMode && config.validationDetection === 'strict') {
            
            // For Laravel strict mode, we need to check if the iframe has reloaded with error parameters
            // If we have expected result data, check against it first
            const expectedResult = iframeData.monitoring?.expectedResult || iframeData.expectedResult;
            const expectedParams = iframeData.monitoring?.expectedParams || iframeData.expectedParams;
            
            // If we expect an error and have the expected parameters, check if newUrl is to google.com (success redirect)
            if (expectedResult === 'error' && expectedParams && 
                (newUrl.includes('google.com') || newUrl.includes('success'))) {
                
                
                
                this.triggerEvent('iframe:form-validation-error', { 
                    uuid, 
                    timestamp: Date.now(),
                    blockedRedirect: newUrl,
                    method: 'laravel-strict-mode',
                    reason: 'expected-validation-error-but-got-success-redirect',
                    expectedParams: expectedParams
                });
                return; // Block the redirect
            }
            
            // Also check the current iframe URL for validation parameters
            let urlToCheck = null;
            const iframe = iframeData.iframe;
            
            // Always try to get the iframe's current URL first (where the form result is)
            try {
                urlToCheck = iframe.contentWindow.location.href;
            } catch (e) {
                // Cross-origin, try iframe.src
                if (iframe && iframe.src) {
                    urlToCheck = iframe.src;
                }
            }
            
            // If we still don't have a URL, use the newUrl as fallback
            if (!urlToCheck || urlToCheck === 'about:blank') {
                urlToCheck = newUrl;
            }
            
            if (urlToCheck) {
                const laravelResult = this.detectLaravelFormResult(urlToCheck, config);
                
                if (laravelResult === false) {
                    // Laravel detected validation error - block redirect
                    
                    
                    
                    this.triggerEvent('iframe:form-validation-error', { 
                        uuid, 
                        timestamp: Date.now(),
                        blockedRedirect: newUrl,
                        method: 'laravel-strict-mode',
                        reason: 'validation-params-detected',
                        checkedUrl: urlToCheck
                    });
                    return; // Block the redirect
                } else {
                    // No validation error detected, proceed with redirect
                    this.performRedirect(uuid, newUrl);
                    return;
                }
            }
        }
        
        // Handle debug mode for regular redirects (not from form submission)
        if ((config.debugMode || config.validationDetection === 'debug') && 
            (!iframeData.monitoring || !iframeData.monitoring.formSubmitted)) {
            
            // For Laravel mode, check if this might be a validation error even without form detection
            let laravelDetection = null;
            let laravelParams = null;
            let shouldRedirect = true;
            let urlToCheck = null; // Declare outside the if block
            
            if (config.laravelMode) {
                // Check the newUrl (destination) for Laravel parameters, not the oldUrl (source)
                urlToCheck = newUrl;
                if (!urlToCheck || urlToCheck === 'cross-origin-navigation') {
                    // For Laravel mode, try multiple methods to get the updated URL
                    const iframe = iframeData.iframe;
                    
                    // Try to access current iframe URL (same-origin only)
                    try {
                        urlToCheck = iframe.contentWindow.location.href;
                        console.log('Laravel debug: Using iframe.contentWindow.location.href:', urlToCheck);
                    } catch (e) {
                        console.log('Laravel debug: Cannot access contentWindow.location, trying iframe.src');
                        
                        if (iframe && iframe.src && iframe.src !== iframeData.monitoring?.originalSrc) {
                            urlToCheck = iframe.src;
                            console.log('Laravel debug: Using iframe.src as fallback:', iframe.src);
                        } else {
                            console.log('Laravel debug: iframe.src unchanged, trying document methods');
                            
                            // Try to get URL from iframe document if accessible
                            try {
                                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                                if (iframeDoc) {
                                    urlToCheck = iframeDoc.URL || iframeDoc.location.href;
                                    console.log('Laravel debug: Using iframe document URL:', urlToCheck);
                                }
                            } catch (e2) {
                                console.log('Laravel debug: Cannot access iframe document, using fallbacks');
                                
                                // Fallback to oldUrl if iframe methods fail
                                urlToCheck = oldUrl;
                                if (!urlToCheck || urlToCheck === 'cross-origin-navigation') {
                                    // Final fallback to original data-src URL
                                    urlToCheck = iframeData.monitoring?.originalSrc;
                                }
                            }
                        }
                    }
                }
                
                if (urlToCheck) {
                    laravelParams = new URL(urlToCheck).search;
                    laravelDetection = this.detectLaravelFormResult(urlToCheck, config);
                    
                    // Check both monitoring and iframe data for expected result
                    const expectedResult = iframeData.monitoring?.expectedResult || iframeData.expectedResult;
                    const expectedParams = iframeData.monitoring?.expectedParams || iframeData.expectedParams;
                    
                    console.log('🔍 Laravel detection result:', {
                        urlToCheck,
                        laravelDetection,
                        hasExpectedResult: !!expectedResult,
                        expectedResult: expectedResult,
                        monitoringKeys: iframeData.monitoring ? Object.keys(iframeData.monitoring) : null,
                        iframeDataKeys: Object.keys(iframeData)
                    });
                    
                    // If Laravel detects validation error from URL, block redirect
                    if (laravelDetection === false) {
                        shouldRedirect = false;
                    } else if (laravelDetection === null && expectedResult === 'error') {
                        // Laravel detection failed but we have stored expected result
                        console.log('🔄 Laravel detection failed, using stored expected result: error');
                        laravelParams = expectedParams || 'stored-error-params';
                        laravelDetection = false; // Force error detection
                        shouldRedirect = false;
                    } else if (laravelDetection === null) {
                        console.log('❌ Laravel detection failed but no stored expected result found');
                    }
                } else {
                    // Check if we have stored expected result when URL access fails completely
                    const expectedResult = iframeData.monitoring?.expectedResult || iframeData.expectedResult;
                    const expectedParams = iframeData.monitoring?.expectedParams || iframeData.expectedParams;
                    
                    console.log('🔍 No URL found, checking stored expected result:', {
                        hasMonitoring: !!iframeData.monitoring,
                        expectedResult: expectedResult,
                        expectedParams: expectedParams
                    });
                    
                    if (expectedResult === 'error') {
                        // Use stored expected result when URL access fails
                        console.log('🔄 Using stored expected result: error');
                        laravelParams = expectedParams || 'stored-error-params';
                        laravelDetection = false; // Force error detection
                        shouldRedirect = false;
                    }
                }
            }
            
            const debugData = {
                success: shouldRedirect,
                method: config.laravelMode ? 'laravel-navigation-check' : 'navigation-detection',
                timeSinceSubmit: 'N/A (not form submission)',
                redirectCount: iframeData.monitoring?.redirectCount || 0,
                canAccessUrl: false,
                currentPath: 'navigation-redirect',
                initialPath: iframeData.monitoring?.initialPath || 'unknown',
                redirectUrl: newUrl,
                reason: config.laravelMode && laravelDetection === false ? 'laravel-error-params-detected' : 'navigation-detected',
                laravelMode: config.laravelMode,
                urlParams: laravelParams,
                laravelResult: laravelDetection,
                checkedUrl: urlToCheck  // Show which URL was actually checked
            };
            
            this.triggerEvent('iframe:debug-info', { 
                uuid, 
                debugData,
                timestamp: Date.now()
            });
            
            this.showDebugDialog(uuid, debugData).then((confirmed) => {
                if (confirmed && shouldRedirect) {
                    this.performRedirect(uuid, newUrl);
                } else if (confirmed && !shouldRedirect) {
                    console.log('Debug: User confirmed Laravel validation error - blocking redirect');
                } else {
                    console.log('Debug: User cancelled navigation redirect');
                }
            });
            return;
        }
        
        // Check if this redirect should be blocked due to form validation error
        if (iframeData.monitoring && iframeData.monitoring.formSubmitted) {
            // This is after form submission - check if it's a validation error
            
            // For Laravel mode with strict validation, always check for error parameters
            if (config.laravelMode && config.validationDetection === 'strict') {
                console.log('🔍 Laravel strict mode form check initiated');
                // For Laravel mode, try to get the current iframe URL which might have error parameters
                let urlToCheck = null;
                const iframe = iframeData.iframe;
                
                // Try multiple methods to get the current iframe URL
                try {
                    urlToCheck = iframe.contentWindow.location.href;
                    console.log('✅ Laravel strict form check: Using iframe.contentWindow.location.href:', urlToCheck);
                } catch (e) {
                    console.log('❌ Laravel strict form check: Cannot access contentWindow.location, trying iframe.src');
                    
                    // Cross-origin - try iframe.src as fallback
                    if (iframe && iframe.src && iframe.src !== iframeData.monitoring?.originalSrc) {
                        urlToCheck = iframe.src;
                        console.log('✅ Laravel strict form check: Using iframe.src as fallback:', iframe.src);
                    } else {
                        console.log('❌ Laravel strict form check: iframe.src unchanged or not available');
                    }
                }
                
                console.log('🔍 Laravel strict form check:', {
                    urlToCheck,
                    errorParams: config.errorParams,
                    successParams: config.successParams
                });
                
                if (urlToCheck) {
                    const laravelResult = this.detectLaravelFormResult(urlToCheck, config);
                    console.log('📊 Laravel detection result:', laravelResult);
                    
                    if (laravelResult === false) {
                        // Laravel detected validation error from URL parameters - block redirect
                        console.log('🚫 Laravel strict mode: Form validation error detected, blocking redirect');
                        this.triggerEvent('iframe:form-validation-error', { 
                            uuid, 
                            timestamp: Date.now(),
                            blockedRedirect: newUrl,
                            method: 'laravel-strict-form',
                            reason: 'validation-params-detected',
                            checkedUrl: urlToCheck
                        });
                        return; // Block the redirect
                    } else {
                        console.log('✅ Laravel strict mode: No validation error detected, allowing redirect');
                    }
                } else {
                    console.log('❌ Laravel strict mode: No URL to check, cannot validate');
                }
            } else if (oldUrl && oldUrl !== 'cross-origin-navigation') {
                // Non-Laravel mode or can access URL - use path comparison
                const currentPath = this.extractPath(oldUrl);
                const initialPath = iframeData.monitoring.initialPath;
                
                if (currentPath === initialPath) {
                    // Same path = validation error, don't redirect
                    this.triggerEvent('iframe:form-validation-error', { 
                        uuid, 
                        timestamp: Date.now(),
                        blockedRedirect: newUrl
                    });
                    return; // Block the redirect
                }
            }
        }
        
        // Laravel mode check for navigation (regardless of form submission)
        if (config.laravelMode && !iframeData.monitoring?.formSubmitted) {
            // For Laravel mode, try to get the current iframe URL which might have error parameters
            let urlToCheck = null;
            const iframe = iframeData.iframe;
            
            // Try multiple methods to get the current iframe URL
            try {
                urlToCheck = iframe.contentWindow.location.href;
                console.log('Laravel non-debug: Using iframe.contentWindow.location.href:', urlToCheck);
            } catch (e) {
                console.log('Laravel non-debug: Cannot access contentWindow.location, trying iframe.src');
                
                // Cross-origin - try iframe.src as fallback
                if (iframe && iframe.src && iframe.src !== iframeData.monitoring?.originalSrc) {
                    urlToCheck = iframe.src;
                    console.log('Laravel non-debug: Using iframe.src as fallback:', iframe.src);
                } else {
                    console.log('Laravel non-debug: iframe.src unchanged, trying document methods');
                    
                    // Try to get URL from iframe document if accessible
                    try {
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        if (iframeDoc) {
                            urlToCheck = iframeDoc.URL || iframeDoc.location.href;
                            console.log('Laravel non-debug: Using iframe document URL:', urlToCheck);
                        }
                    } catch (e2) {
                        console.log('Laravel non-debug: Cannot access iframe document, using fallbacks');
                        
                        // Final fallback to oldUrl or originalSrc
                        urlToCheck = oldUrl;
                        if (!urlToCheck || urlToCheck === 'cross-origin-navigation') {
                            urlToCheck = iframeData.monitoring?.originalSrc;
                        }
                    }
                }
            }
            
            if (urlToCheck) {
                const laravelResult = this.detectLaravelFormResult(urlToCheck, config);
                if (laravelResult === false) {
                    // Laravel detected validation error from URL parameters - block redirect
                    this.triggerEvent('iframe:form-validation-error', { 
                        uuid, 
                        timestamp: Date.now(),
                        blockedRedirect: newUrl,
                        method: 'laravel-url-params',
                        reason: 'validation-params-detected',
                        checkedUrl: urlToCheck
                    });
                    return; // Block the redirect
                }
            }
        }
        
        // Auto-redirect for detected navigation (only if not blocked above)
        this.performRedirect(uuid, newUrl);
    }
    
    // Perform the actual redirect
    performRedirect(uuid, newUrl) {
        const iframeData = this.iframes.get(uuid);
        if (!iframeData?.config.allowRedirect) {
            return;
        }
        
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
            console.log('Redirect blocked: invalid URL or cross-origin navigation');
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
        console.log('📨 Message received:', event.data);
        
        if (!this.isValidMessage(event)) {
            console.log('❌ Invalid message, ignoring');
            return;
        }
        
        const { type, uuid, payload } = event.data;
        const iframeData = this.iframes.get(uuid);
        
        if (!iframeData) {
            console.log('❌ No iframe data found for UUID:', uuid);
            return;
        }
        
        console.log('✅ Processing message:', { type, uuid, payload });
        
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
                
            case 'FORM_SUBMIT':
                this.handleFormSubmit(uuid, iframeData, payload);
                break;
                
            case this.messageTypes.ERROR:
                this.handleError(uuid, payload);
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
        if (!iframeData.config.allowRedirect) {
            return;
        }
        
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
    handleError(uuid, payload) {
        console.error(`Smart Iframe Error [${uuid}]:`, payload);
        this.triggerEvent('iframe:error', { uuid, error: payload });
    }
    
    // Handle form submission notification from iframe
    handleFormSubmit(uuid, iframeData, payload) {
        const timestamp = Date.now();
        console.log('🚀 FORM_SUBMIT received at', timestamp, ':', uuid, payload);
        
        if (iframeData.monitoring) {
            iframeData.monitoring.formSubmitted = true;
            iframeData.monitoring.formSubmitTime = timestamp;
            
            // Store expected result for Laravel detection in a persistent location
            if (payload.expectedResult) {
                iframeData.monitoring.expectedResult = payload.expectedResult;
                iframeData.monitoring.expectedParams = payload.expectedParams;
                
                // Also store in iframe data directly to prevent loss during monitoring reset
                iframeData.expectedResult = payload.expectedResult;
                iframeData.expectedParams = payload.expectedParams;
                
                console.log('📝 Stored expected result:', payload.expectedResult, payload.expectedParams);
            }
            
            console.log('✅ Form submission marked for UUID at', timestamp, ':', uuid);
            console.log('📊 Current iframe monitoring state:', iframeData.monitoring);
            
            this.triggerEvent('iframe:form-submitting', { 
                uuid, 
                formId: payload.formId,
                method: payload.method,
                action: payload.action,
                timestamp: timestamp
            });
        } else {
            console.log('❌ No monitoring data for UUID:', uuid);
        }
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
        return 'iframe_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
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