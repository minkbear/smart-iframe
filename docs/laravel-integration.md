# Laravel Integration Guide

Complete integration guide for using Smart Iframe with Laravel applications and server-side validation.

## Overview

Smart Iframe's Laravel mode provides intelligent form validation detection specifically designed for Laravel applications using server-side validation. When validation fails, Laravel typically redirects back to the same URL with error messages, but Smart Iframe can detect these validation errors and prevent unwanted redirects on the parent page.

## Quick Start

### 1. Basic Configuration

```html
<div class="smartIframe"
     data-src="https://your-laravel-app.com/contact"
     data-laravel-mode="true"
     data-validation-detection="debug"
     data-error-params="errors,validation_status=error,status=error"
     data-success-params="status=success,success=1,submitted=true">
</div>
```

### 2. Laravel Controller Setup

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ContactController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'message' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            // Validation failed - redirect back with error status
            return redirect()->back()
                ->withInput()
                ->withErrors($validator)
                ->with([
                    'status' => 'error',
                    'validation_status' => 'error'
                ]);
        }

        // Process successful form submission
        // ... your logic here ...

        // Success - redirect to success URL
        $redirectUrl = $request->get('redirect', '/thank-you');
        return redirect($redirectUrl)->with('status', 'success');
    }
}
```

### 3. Blade Template JavaScript

Add this JavaScript to your Laravel Blade template to notify the parent frame:

```html
<!-- In your Laravel blade template -->
<script>
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('contact-form');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            // Notify parent window before form submission
            if (window.parent !== window) {
                const urlParams = new URLSearchParams(window.location.search);
                const uuid = urlParams.get('uuid') || 'unknown';
                
                window.parent.postMessage({
                    type: 'FORM_SUBMIT',
                    uuid: uuid,
                    payload: {
                        formId: 'contact-form',
                        method: 'POST',
                        action: this.action || window.location.href
                    }
                }, '*');
            }
        });
    }
});
</script>
```

## Configuration Options

### Laravel-Specific Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `data-laravel-mode` | Enable Laravel-specific detection | `false` | `"true"` |
| `data-error-params` | Parameters that indicate validation errors | `"errors,validation_status=error,status=error"` | `"errors,status=error"` |
| `data-success-params` | Parameters that indicate successful submission | `"status=success,success=1,submitted=true"` | `"status=success"` |
| `data-validation-timing` | Timing threshold for validation detection (ms) | `500` | `300` |

### Detection Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `auto` | Automatic detection using heuristics | General Laravel apps |
| `debug` | Debug mode with detailed information | Development & troubleshooting |
| `strict` | **NEW** - Advanced validation detection with error blocking | Production forms requiring strict validation |
| `off` | Disable validation detection | Always redirect |

#### New: Strict Mode (Recommended for Production)

Strict mode provides the most reliable Laravel validation detection:

```html
<div class="smartIframe"
     data-src="https://your-laravel-app.com/contact"
     data-laravel-mode="true"
     data-validation-detection="strict"
     data-error-params="errors,validation_status=error,status=error"
     data-success-params="status=success,success=1,submitted=true">
</div>
```

**Strict Mode Features**:
- **Automatic Error Detection**: Blocks redirects when validation errors are expected
- **Parameter-Based Validation**: Detects error parameters in URLs immediately
- **Expected Result Validation**: Compares expected vs actual form results
- **No User Interaction**: Works silently without popups or confirmations
- **Production Ready**: Optimized for reliability and performance

## Advanced Implementation

### 1. Custom Error Parameters

If your Laravel app uses custom error parameters:

```html
<div class="smartIframe"
     data-src="https://your-app.com/form"
     data-laravel-mode="true"
     data-error-params="has_errors,form_error=1,validation_failed"
     data-success-params="form_success=1,submitted=true">
</div>
```

### 2. Multiple Form Handling

For applications with multiple forms:

```javascript
// Generic form handler for all Laravel forms
document.querySelectorAll('form[data-smart-iframe]').forEach(form => {
    form.addEventListener('submit', function(e) {
        if (window.parent !== window) {
            const urlParams = new URLSearchParams(window.location.search);
            const uuid = urlParams.get('uuid') || 'unknown';
            
            window.parent.postMessage({
                type: 'FORM_SUBMIT',
                uuid: uuid,
                payload: {
                    formId: this.id || 'laravel-form',
                    method: this.method || 'POST',
                    action: this.action || window.location.href,
                    formType: this.dataset.smartIframe || 'generic'
                }
            }, '*');
        }
    });
});
```

### 3. Laravel Validation Helper

Create a Laravel helper for consistent validation responses:

```php
<?php

namespace App\Helpers;

class SmartIframeHelper
{
    /**
     * Create validation error redirect with Smart Iframe compatible parameters
     */
    public static function validationErrorRedirect($validator, $request)
    {
        return redirect()->back()
            ->withInput()
            ->withErrors($validator)
            ->with([
                'status' => 'error',
                'validation_status' => 'error',
                'errors' => '1'
            ])
            ->withFragment('smart-iframe-error');
    }

    /**
     * Create success redirect with Smart Iframe compatible parameters
     */
    public static function successRedirect($request, $defaultUrl = '/thank-you')
    {
        $redirectUrl = $request->get('redirect', $defaultUrl);
        
        return redirect($redirectUrl)
            ->with([
                'status' => 'success',
                'success' => '1',
                'submitted' => 'true'
            ]);
    }
}
```

Usage in controller:

```php
use App\Helpers\SmartIframeHelper;

public function store(Request $request)
{
    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails()) {
        return SmartIframeHelper::validationErrorRedirect($validator, $request);
    }

    // Process form...

    return SmartIframeHelper::successRedirect($request);
}
```

## Troubleshooting

### Debug Mode

Enable debug mode to see detailed information:

```html
<div class="smartIframe"
     data-validation-detection="debug"
     data-laravel-mode="true">
</div>
```

Debug dialog will show:
- Detection method used
- URL parameters found
- Laravel detection results
- Decision reasoning

### Common Issues

#### 1. Form Submit Not Detected
**Problem**: Smart Iframe shows "navigation-detection" instead of "form-submission-analysis"

**Solution**: Ensure JavaScript postMessage is sent before form submission:
```javascript
// Make sure this runs before form.submit()
window.parent.postMessage({
    type: 'FORM_SUBMIT',
    uuid: uuid,
    payload: { formId: 'your-form-id' }
}, '*');
```

#### 2. Validation Errors Not Detected
**Problem**: Form redirects even with validation errors

**Solutions**:
1. Check error parameters match configuration:
   ```php
   // Laravel Controller
   ->with('status', 'error')  // Must match data-error-params
   ```

2. Verify URL parameters are sent:
   ```html
   <!-- Should appear in URL after validation error -->
   ?status=error&validation_status=error
   ```

#### 3. Cross-Origin Detection Issues
**Problem**: Cannot access iframe URL for parameter detection

**Solution**: Smart Iframe will fall back to timing analysis in Laravel mode:
```html
<div data-laravel-mode="true" 
     data-validation-timing="300"> <!-- Adjust timing threshold -->
</div>
```

## Event Monitoring

Monitor Smart Iframe events for debugging and analytics:

```javascript
// Laravel-specific event monitoring
window.smartIframes.on('iframe:debug-info', (data) => {
    if (data.debugData.laravelMode) {
        console.log('Laravel Detection:', {
            urlParams: data.debugData.urlParams,
            laravelResult: data.debugData.laravelResult,
            success: data.debugData.success
        });
    }
});

window.smartIframes.on('iframe:form-validation-error', (data) => {
    if (data.method === 'laravel-url-params') {
        console.log('Laravel validation error detected:', data.checkedUrl);
    }
});

window.smartIframes.on('iframe:form-result', (data) => {
    console.log('Laravel form result:', {
        success: data.success,
        method: data.method
    });
});
```

## Best Practices

### 1. Consistent Error Handling
Always use consistent parameter names across your Laravel application:

```php
// In your base controller or service class
const IFRAME_ERROR_PARAMS = [
    'status' => 'error',
    'validation_status' => 'error',
    'errors' => '1'
];

const IFRAME_SUCCESS_PARAMS = [
    'status' => 'success',
    'success' => '1'
];
```

### 2. Performance Optimization
For better performance, use URL parameter detection over timing analysis:

```html
<!-- Preferred: Parameter-based detection -->
<div data-laravel-mode="true" 
     data-error-params="status=error,errors">
</div>

<!-- Fallback: Timing-based detection for cross-origin -->
<div data-validation-timing="200">
</div>
```

### 3. Security Considerations
- Never include sensitive data in URL parameters
- Use HTTPS for all iframe communications
- Validate redirect URLs in your Laravel controller:

```php
public function store(Request $request)
{
    $redirectUrl = $request->get('redirect');
    
    // Validate redirect URL
    if ($redirectUrl && !$this->isAllowedRedirectUrl($redirectUrl)) {
        $redirectUrl = '/default-success';
    }
    
    // ... rest of your logic
}
```

## Migration Guide

### From Standard Mode to Laravel Mode

1. **Update HTML configuration**:
```html
<!-- Before -->
<div class="smartIframe" data-src="form-url">
</div>

<!-- After -->
<div class="smartIframe" 
     data-src="form-url"
     data-laravel-mode="true"
     data-error-params="errors,status=error">
</div>
```

2. **Update Laravel controllers**:
```php
// Before
return redirect()->back()->withErrors($validator);

// After  
return redirect()->back()
    ->withErrors($validator)
    ->with('status', 'error');
```

3. **Add JavaScript to templates**:
```javascript
// Add form submission notification
form.addEventListener('submit', function() {
    window.parent.postMessage({
        type: 'FORM_SUBMIT',
        payload: { formId: this.id }
    }, '*');
});
```

## Testing

### Test Your Integration

Use the provided test files to verify your Laravel integration:

1. **Basic test**: Load your Laravel form in Smart Iframe
2. **Validation test**: Submit invalid data, should NOT redirect
3. **Success test**: Submit valid data, SHOULD redirect
4. **Debug test**: Enable debug mode to see detection details

### Example Test URLs

```html
<!-- Test validation error -->
<div class="smartIframe" 
     data-src="https://your-app.com/form?status=error&errors=1"
     data-laravel-mode="true"
     data-validation-detection="debug">
</div>

<!-- Should show: WON'T REDIRECT -->
```

## Support

For additional support and examples:
- Check the `/test-laravel-local.html` example file
- Enable debug mode for detailed detection information
- Monitor browser console for Smart Iframe events
- Review the Laravel detection logic in debug dialog

## Changelog

- **v1.0**: Initial Laravel mode support
- **v1.1**: Added URL parameter fallback detection
- **v1.2**: Enhanced debug mode with Laravel-specific information
- **v1.3**: Added timing analysis for cross-origin detection
- **v1.4**: **NEW** - Added strict mode validation with automatic error blocking and expected result validation