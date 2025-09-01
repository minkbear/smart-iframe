# Migration Guide: Smart Iframe v1 to v2

## 📋 Overview

This guide helps you migrate from Smart Iframe Loader v1 to v2. The migration is designed to be smooth with minimal breaking changes.

## ⚡ Quick Migration (5 minutes)

### Step 1: Replace the Script

**Before (v1):**
```html
<script src="dist/smart-iframe.min.js"></script>
```

**After (v2):**
```html
<script src="dist/smart-iframe-v2.min.js"></script>
```

### Step 2: Add Cross-Origin Flag (Optional)

For cross-origin iframes, add the flag:
```html
<div class="smartIframe" 
     data-src="https://other-domain.com/form.html"
     data-cross-origin="true">  <!-- New in v2 -->
</div>
```

### Step 3: Add Helper Script to iframe Pages

For cross-origin iframes to work properly, add to iframe pages:
```html
<!-- At the end of iframe page body -->
<script src="iframe-injector.js"></script>
```

**That's it! Your basic setup should work.** 

## 🔄 Detailed Migration Guide

### 1. HTML Markup Changes

#### ✅ No Changes Required for Basic Usage

v2 is backward compatible with v1 HTML markup:

```html
<!-- This works in both v1 and v2 -->
<div class="smartIframe" 
     data-src="https://example.com/form.html"
     data-allow-resize="true"
     data-allow-redirect="true">
</div>
```

#### 🆕 New Optional Attributes in v2

```html
<div class="smartIframe"
     data-src="..."
     data-cross-origin="true"      <!-- Explicitly mark as cross-origin -->
     data-debug-mode="true">        <!-- Enhanced debug in v2 -->
</div>
```

### 2. JavaScript API Changes

#### ✅ Backward Compatible APIs

These work the same in v2:

```javascript
// Event listeners - Same syntax
smartIframes.on('iframe:ready', callback);
smartIframes.on('iframe:resize', callback);
smartIframes.on('iframe:redirect', callback);

// Methods - Same syntax
smartIframes.getIframe(uuid);
smartIframes.getAllIframes();
smartIframes.removeIframe(uuid);
smartIframes.sendToIframe(uuid, type, payload);
```

#### 🆕 New Events in v2

```javascript
// New events for better cross-origin support
smartIframes.on('iframe:url-update', (data) => {
    console.log('URL updated:', data.url);
});

smartIframes.on('iframe:message-received', (data) => {
    console.log('Message from iframe:', data);
});

smartIframes.on('iframe:cross-origin-detected', (data) => {
    console.log('Cross-origin iframe detected:', data.uuid);
});
```

### 3. Cross-Origin Handling

#### ❌ v1 Approach (Problematic)

```javascript
// v1 tried to access this for ALL iframes
iframe.contentWindow.location.href  // Throws error for cross-origin!
```

#### ✅ v2 Approach (Smart)

```javascript
// v2 automatically detects and handles appropriately
if (isCrossOrigin) {
    // Uses postMessage only
} else {
    // Can use direct access
}
```

### 4. Configuration Changes

#### Laravel Mode - Enhanced in v2

v1 configuration still works:
```html
<div class="smartIframe"
     data-laravel-mode="true"
     data-validation-detection="strict">
</div>
```

v2 adds better cross-origin support for Laravel:
```html
<div class="smartIframe"
     data-laravel-mode="true"
     data-validation-detection="strict"
     data-cross-origin="true"        <!-- Better handling -->
     data-debug-mode="true">          <!-- See what's happening -->
</div>
```

### 5. Error Handling

#### v1 Errors You'll No Longer See

```
❌ SecurityError: Blocked a frame with origin "https://example.com" from accessing a cross-origin frame
❌ DOMException: Permission denied to access property "location"
❌ TypeError: Cannot read property 'href' of undefined
```

#### v2 Helpful Messages

```
✅ Smart Iframe: Cross-origin detected for iframe_abc123. Waiting for postMessage communication...
✅ Smart Iframe: No postMessage received. Helper script may not be installed.
✅ Smart Iframe: Using fallback mode for iframe_abc123
```

## 🔧 Common Migration Scenarios

### Scenario 1: Same-Origin iframes Only

**No changes required!** v2 works exactly like v1 for same-origin iframes.

### Scenario 2: Cross-Origin iframes (Basic)

**Minimal changes:**
1. Update script to v2
2. Add `data-cross-origin="true"` (optional but recommended)
3. Add iframe-injector.js to iframe pages (for full functionality)

### Scenario 3: WordPress Integration

**Update your functions.php:**

```php
// Before (v1)
wp_enqueue_script('smart-iframe', 
    'path/to/smart-iframe.min.js', 
    array(), '1.0.0', true);

// After (v2)
wp_enqueue_script('smart-iframe', 
    'path/to/smart-iframe-v2.min.js', 
    array(), '2.0.0', true);
```

### Scenario 4: Laravel Forms

**Update your blade template:**

```blade
{{-- Before (v1) --}}
<div class="smartIframe" 
     data-src="{{ route('form') }}"
     data-laravel-mode="true">
</div>

{{-- After (v2) - Add debug mode to see improvements --}}
<div class="smartIframe" 
     data-src="{{ route('form') }}"
     data-laravel-mode="true"
     data-debug-mode="true">
</div>

{{-- In your form view, add helper script --}}
@if(request()->has('uuid'))
    <script src="{{ asset('js/iframe-injector.js') }}"></script>
@endif
```

## 📊 Before/After Comparison

### Console Output Comparison

**v1 with Cross-Origin iframe:**
```
❌ Uncaught DOMException: Blocked a frame with origin...
❌ Error in setupNavigationDetection: SecurityError
❌ Fallback to iframe.src monitoring
⚠️ Warning: Cannot detect internal navigation
```

**v2 with Cross-Origin iframe:**
```
✅ Smart Iframe: Cross-origin detected for iframe_abc123
✅ Smart Iframe: Waiting for postMessage communication
✅ Smart Iframe: Message received from iframe_abc123
✅ Smart Iframe: URL update received: https://...
```

### Code Comparison

**v1 Pattern (Error-Prone):**
```javascript
// Always tried to access location
try {
    url = iframe.contentWindow.location.href;
} catch(e) {
    // Fallback to less reliable method
    url = iframe.src;  // Doesn't update on navigation!
}
```

**v2 Pattern (Smart):**
```javascript
// Intelligent handling based on origin
if (iframeData.isCrossOrigin) {
    // Wait for postMessage from iframe
    // No errors, graceful fallback
} else {
    // Direct access for same-origin
    url = iframe.contentWindow.location.href;
}
```

## 🚀 Migration Checklist

- [ ] **Backup current implementation**
- [ ] **Update script reference** to v2
- [ ] **Add iframe-injector.js** to iframe pages (for cross-origin)
- [ ] **Test same-origin iframes** - Should work identically
- [ ] **Test cross-origin iframes** - Should have no console errors
- [ ] **Enable debug mode** temporarily to verify everything works
- [ ] **Update event listeners** if using new v2 events
- [ ] **Remove any workarounds** for cross-origin issues
- [ ] **Test form submissions** and validations
- [ ] **Verify redirects** work correctly
- [ ] **Disable debug mode** for production

## ⚠️ Breaking Changes

### Minimal Breaking Changes

1. **Global Variable Name** (if directly accessing):
   - v1: `window.smartIframe` (some versions)
   - v2: `window.smartIframes` (consistent)

2. **Internal Data Structure** (if accessing directly):
   - v1: `iframeData.monitoring`
   - v2: `iframeData.isCrossOrigin`, `iframeData.messageReceived`

3. **Event Data Structure** (enhanced in v2):
   - Some events now include additional fields

### Non-Breaking Improvements

- Better error messages
- No security errors in console
- Automatic origin detection
- Graceful fallbacks
- Enhanced debug information

## 🔍 Troubleshooting

### Issue: "No postMessage received" warning

**Solution:** Add iframe-injector.js to your iframe pages:
```html
<script src="iframe-injector.js"></script>
```

### Issue: Events not firing for cross-origin

**Solution:** This is expected without helper script. Add the script or use fallback events:
```javascript
smartIframes.on('iframe:possible-navigation', (data) => {
    // Fallback event for cross-origin without helper
});
```

### Issue: Different behavior between v1 and v2

**Solution:** Enable debug mode to see what's happening:
```html
<div class="smartIframe" data-debug-mode="true">
```

## 📈 Benefits After Migration

### Immediate Benefits
- ✅ No more console errors for cross-origin iframes
- ✅ Cleaner console output
- ✅ Better debugging experience
- ✅ More reliable cross-origin handling

### Long-term Benefits
- ✅ Future-proof architecture
- ✅ Better performance (less polling)
- ✅ Easier troubleshooting
- ✅ Industry-standard approach (like Pipedrive)

## 🆘 Need Help?

1. **Check the console** - v2 provides helpful messages
2. **Enable debug mode** - See detailed information
3. **Review the [v2 Overview](./smart-iframe-v2-overview.md)**
4. **Check [Cross-Origin Setup](../CROSS-ORIGIN-SETUP.md)**
5. **Open an issue** on GitHub

## 🎉 Migration Complete!

After migration, you should see:
- Clean console (no security errors)
- Better cross-origin support
- Helpful debug messages
- Same functionality for same-origin
- Enhanced functionality for cross-origin (with helper script)