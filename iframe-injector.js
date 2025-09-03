/**
 * Smart Iframe Injector Script
 * This script should be injected into the iframe page to detect URL changes
 * and send them back to the parent window via postMessage
 */

(function() {
    // Get UUID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const uuid = urlParams.get('uuid');
    
    if (!uuid) {
        console.warn('Smart Iframe: No UUID found in URL');
        return;
    }
    
    console.log('Smart Iframe Injector: Initialized for UUID:', uuid);
    
    // Function to send current URL to parent
    function sendUrlUpdate() {
        const message = {
            type: 'IFRAME_URL_UPDATE',
            uuid: uuid,
            url: window.location.href,
            search: window.location.search,
            pathname: window.location.pathname,
            timestamp: Date.now()
        };
        
        // Send to parent window
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(message, '*');
            console.log('Smart Iframe Injector: Sent URL update:', message);
        }
    }
    
    // Send initial URL
    sendUrlUpdate();
    
    // Monitor for URL changes using various methods
    
    // Method 1: Listen for popstate (browser back/forward)
    window.addEventListener('popstate', function() {
        console.log('Smart Iframe Injector: Popstate detected');
        sendUrlUpdate();
    });
    
    // Method 2: Override pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
        originalPushState.apply(history, arguments);
        setTimeout(sendUrlUpdate, 100);
    };
    
    history.replaceState = function() {
        originalReplaceState.apply(history, arguments);
        setTimeout(sendUrlUpdate, 100);
    };
    
    // Method 3: Monitor for form submissions
    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form && form.tagName === 'FORM') {
            console.log('Smart Iframe Injector: Form submission detected via submit event');
            sendFormSubmissionMessage(form);
        }
    }, true); // Use capture phase
    
    // Enhanced form detection function
    function sendFormSubmissionMessage(form) {
        console.log('Smart Iframe Injector: Sending form submission message', form);
        
        const formMessage = {
            type: 'FORM_SUBMIT',
            uuid: uuid,
            formId: form.id || form.name || 'unknown',
            method: form.method || 'GET',
            action: form.action || window.location.href,
            timestamp: Date.now()
        };
        
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(formMessage, '*');
            console.log('Smart Iframe Injector: Form submission message sent to parent:', formMessage);
        }
        
        // Check for URL change after form submission
        setTimeout(sendUrlUpdate, 500);
        setTimeout(sendUrlUpdate, 1000);
        setTimeout(sendUrlUpdate, 2000);
    }
    
    // Method 3b: Monitor for button clicks (fallback)
    document.addEventListener('click', function(e) {
        const target = e.target;
        
        // Check if clicked element is submit button or inside a form
        if (target.type === 'submit' || 
            target.tagName === 'BUTTON' ||
            (target.tagName === 'INPUT' && (target.type === 'submit' || target.type === 'button'))) {
            
            console.log('Smart Iframe Injector: Submit button clicked:', target);
            
            // Find parent form
            const form = target.closest('form');
            if (form) {
                console.log('Smart Iframe Injector: Form found for submit button:', form);
                // Delay to allow form processing
                setTimeout(function() {
                    sendFormSubmissionMessage(form);
                }, 100);
            }
        }
        
        // Also check for any element with onclick that might submit forms
        if (target.onclick || target.getAttribute('onclick')) {
            console.log('Smart Iframe Injector: Element with onclick detected:', target);
            setTimeout(function() {
                // Check if URL changed after click (indicating form submission)
                if (window.location.href !== lastUrl) {
                    console.log('Smart Iframe Injector: URL changed after click - assuming form submission');
                    const formMessage = {
                        type: 'FORM_SUBMIT',
                        uuid: uuid,
                        formId: 'clicked_element',
                        method: 'unknown',
                        action: window.location.href,
                        timestamp: Date.now()
                    };
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage(formMessage, '*');
                    }
                }
            }, 500);
        }
    }, true);
    
    // Method 4: Periodic URL check (fallback)
    let lastUrl = window.location.href;
    setInterval(function() {
        if (window.location.href !== lastUrl) {
            console.log('Smart Iframe Injector: URL change detected via polling');
            lastUrl = window.location.href;
            sendUrlUpdate();
        }
    }, 1000);
    
    // Method 5: Listen for Laravel-specific validation events
    document.addEventListener('DOMContentLoaded', function() {
        // Check for Laravel validation error indicators
        const hasErrors = window.location.search.includes('error') || 
                         window.location.search.includes('validation_status=error') ||
                         document.querySelector('.alert-danger') ||
                         document.querySelector('.invalid-feedback') ||
                         document.querySelector('[class*="error"]');
        
        if (hasErrors) {
            console.log('Smart Iframe Injector: Validation errors detected');
            const errorMessage = {
                type: 'VALIDATION_ERROR_DETECTED',
                uuid: uuid,
                url: window.location.href,
                hasErrors: true,
                timestamp: Date.now()
            };
            
            if (window.parent && window.parent !== window) {
                window.parent.postMessage(errorMessage, '*');
            }
        }
    });
    
    console.log('Smart Iframe Injector: All monitors activated');
})();