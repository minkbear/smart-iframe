# Laravel Quick Start Guide

**5-minute setup** for Smart Iframe Laravel integration.

## 🚀 Quick Setup (5 minutes)

### 1. HTML Setup

**Production (Recommended)**:
```html
<div class="smartIframe"
     data-src="https://your-laravel-app.com/contact"
     data-laravel-mode="true"
     data-validation-detection="strict">
</div>

<script src="smart-iframe.js"></script>
```

**Development (For Testing)**:
```html
<div class="smartIframe"
     data-src="https://your-laravel-app.com/contact"
     data-laravel-mode="true"
     data-validation-detection="debug">
</div>
```

### 2. Laravel Controller
```php
public function store(Request $request)
{
    $validator = Validator::make($request->all(), [
        'name' => 'required',
        'email' => 'required|email',
    ]);

    if ($validator->fails()) {
        return redirect()->back()
            ->withErrors($validator)
            ->with('status', 'error');  // 👈 Add this
    }

    $redirectUrl = $request->get('redirect', '/thank-you');
    return redirect($redirectUrl)->with('status', 'success');
}
```

### 3. Blade Template JavaScript
```html
<!-- Add to your form page -->
<script>
document.getElementById('contact-form').addEventListener('submit', function() {
    if (window.parent !== window) {
        window.parent.postMessage({
            type: 'FORM_SUBMIT',
            payload: { formId: 'contact-form' }
        }, '*');
    }
});
</script>
```

## ✅ Test Your Setup

1. **Load form** → Should show iframe
2. **Submit empty form** → Should NOT redirect (validation error)
3. **Submit valid form** → SHOULD redirect (success)
4. **Check debug dialog** → Shows Laravel detection results

## 🔧 Configuration Options

**Strict Mode (Recommended)**:
```html
<div class="smartIframe"
     data-src="your-form-url"
     data-laravel-mode="true"
     data-validation-detection="strict"
     data-error-params="errors,status=error"
     data-success-params="status=success,success=1">
</div>
```

**Debug Mode (Development)**:
```html
<div class="smartIframe"
     data-src="your-form-url"
     data-laravel-mode="true"
     data-validation-detection="debug"
     data-error-params="errors,status=error"
     data-success-params="status=success,success=1">
</div>
```

### Detection Modes
- **`strict`**: 🎯 Production ready - blocks errors automatically, no popups
- **`debug`**: 🔍 Development mode - shows debug dialogs for troubleshooting  
- **`auto`**: ⚡ General detection using heuristics

## 🚨 Common Issues

**Problem**: Still redirects on validation error
- ✅ Add `->with('status', 'error')` to Laravel controller
- ✅ Add JavaScript postMessage to form
- ✅ Enable debug mode to see detection info

**Problem**: Form submit not detected
- ✅ Ensure JavaScript runs before form submission
- ✅ Check postMessage is sent to `window.parent`

## 📖 Full Documentation

See [laravel-integration.md](laravel-integration.md) for complete guide.