# Cross-Origin iframe Setup Guide

## 🚀 Smart Iframe v2 - Better Cross-Origin Support

### Version Compatibility
- **v1**: Limited cross-origin support with console errors
- **v2**: Full cross-origin support following Pipedrive's approach (Recommended)

## ปัญหา Cross-Origin และวิธีแก้ไข

### ทำไม Cross-Origin iframes ถึงยาก?

เมื่อ parent page (test.com) และ iframe (iftest.com) อยู่คนละ domain, browser จะบล็อกการเข้าถึง `iframe.contentWindow.location` ด้วย Same-Origin Policy เพื่อความปลอดภัย

### วิธีการทำงานของ Smart Iframe v2

Smart Iframe v2 ใช้วิธีเดียวกับ Pipedrive Leadbooster และ industry standards:

1. **ไม่พยายามเข้าถึง iframe URL โดยตรง** (ไม่มี error)
2. **ตรวจสอบ origin อัตโนมัติ** และเลือกวิธีที่เหมาะสม
3. **ใช้ postMessage API** สำหรับการสื่อสารข้าม domain
4. **Graceful fallback** เมื่อไม่มี helper script

## วิธี Setup

### 1. ฝั่ง Parent Domain (test.com)

#### For v2 (Recommended)
```html
<!-- Include SmartIframeLoader v2 -->
<script src="https://your-cdn.com/smart-iframe-v2.min.js"></script>

<!-- Create iframe container -->
<div class="smartIframe" 
     data-src="https://iftest.com/form.html"
     data-allow-resize="true"
     data-allow-redirect="true"
     data-cross-origin="true"      <!-- Optional: Explicitly mark as cross-origin -->
     data-debug-mode="true">        <!-- Optional: See helpful debug messages -->
</div>
```

#### For v1 (Legacy)
```html
<!-- Include SmartIframeLoader v1 -->
<script src="https://your-cdn.com/smart-iframe.min.js"></script>

<!-- Create iframe container -->
<div class="smartIframe" 
     data-src="https://iftest.com/form.html"
     data-allow-resize="true"
     data-allow-redirect="true">
</div>
```

**Note:** v2 will automatically detect cross-origin and handle it properly without console errors.

### 2. ฝั่ง iframe Domain (iftest.com)

**ต้อง include iframe-injector.js ในทุกหน้าที่จะแสดงใน iframe:**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Your Form Page</title>
</head>
<body>
    <!-- Your form content -->
    <form id="contact-form">
        <!-- form fields -->
    </form>
    
    <!-- IMPORTANT: Add this script at the end of body -->
    <script src="https://your-cdn.com/iframe-injector.js"></script>
    
    <!-- Or include inline -->
    <script>
        // Copy content from iframe-injector.js here
    </script>
</body>
</html>
```

### 3. Server-Side Auto-Injection (Optional)

#### PHP Example
```php
// Add to your layout/template file
<?php if (isset($_GET['uuid'])): ?>
    <script src="/path/to/iframe-injector.js"></script>
<?php endif; ?>
```

#### Node.js/Express Example
```javascript
app.use((req, res, next) => {
    if (req.query.uuid) {
        // Inject script into HTML response
        res.locals.injectIframeScript = true;
    }
    next();
});
```

#### Laravel Example
```blade
{{-- In your layout blade file --}}
@if(request()->has('uuid'))
    <script src="{{ asset('js/iframe-injector.js') }}"></script>
@endif
```

## How It Works

### v2 Intelligent Origin Detection

```javascript
// v2 automatically detects origin type
if (isCrossOrigin(iframeUrl)) {
    // Use postMessage only - no errors!
    console.log("Cross-origin detected, using postMessage");
} else {
    // Can use direct access for same-origin
    console.log("Same-origin detected, full access available");
}
```

### การสื่อสารระหว่าง Parent และ iframe

```
Parent (test.com)                    iframe (iftest.com)
     |                                      |
     |-- Load iframe with ?uuid=xxx ------>|
     |                                      |
     |<--- postMessage: IFRAME_URL_UPDATE --|
     |                                      |
     |<--- postMessage: FORM_SUBMIT --------|
     |                                      |
     |<--- postMessage: VALIDATION_ERROR ---|
     |                                      |
```

### ข้อมูลที่ iframe-injector.js ส่งกลับ

1. **URL Updates** - เมื่อ URL เปลี่ยน
2. **Form Submissions** - เมื่อมีการ submit form
3. **Validation Errors** - เมื่อตรวจพบ validation error
4. **Page Navigation** - เมื่อมีการ navigate

## Fallback Mode (เมื่อไม่มี Helper Script)

### v2 Fallback (Smart & Graceful)

v2 จะแสดง debug message และใช้ limited functionality:

```javascript
Console: "Smart Iframe: No postMessage received from iframe_abc123. Helper script may not be installed."
Console: "Using limited fallback mode for cross-origin iframe"
```

Features ที่ยังทำงานได้:
1. **Load Event Counting** - นับจำนวนครั้งที่ iframe โหลด
2. **Progressive Resize** - ค่อยๆ เพิ่มความสูง
3. **Basic Redirect Detection** - ตรวจจับ redirect จาก URL parameters

### v1 Fallback (Error-Prone)

v1 จะแสดง console errors และพยายาม workaround:

```javascript
Console Error: "SecurityError: Blocked a frame with origin..."
Console Error: "Cannot read property 'location' of undefined"
```

Fallback ของ v1:
1. **iframe.src Monitoring** - ดู src attribute (ไม่ update เมื่อ navigate)
2. **Timing Heuristics** - ไม่แม่นยำ
3. **Load Counting** - อาจนับผิด

## Security Considerations

1. **ตรวจสอบ Origin** - ควรตรวจสอบ origin ของ postMessage
2. **ใช้ UUID** - เพื่อจับคู่ iframe กับ message
3. **Validate Messages** - ตรวจสอบ structure ของ message ก่อนใช้

## Testing Cross-Origin

### Test Locally with Different Ports
```bash
# Terminal 1 - Parent site
python -m http.server 8000

# Terminal 2 - iframe site  
python -m http.server 8001
```

แล้วเปิด:
- Parent: http://localhost:8000/test.html
- iframe จะโหลดจาก: http://localhost:8001/form.html

### Using ngrok for Testing
```bash
# Expose local server
ngrok http 8000

# You'll get URLs like:
# https://abc123.ngrok.io (parent)
# https://xyz789.ngrok.io (iframe)
```

## Common Issues

### 1. iframe-injector.js ไม่ทำงาน
- ตรวจสอบว่า script โหลดหลัง DOM ready
- ตรวจสอบว่ามี `?uuid=` parameter ใน URL

### 2. postMessage ไม่ส่ง
- ตรวจสอบ browser console ดู error
- ตรวจสอบว่า parent window ยังอยู่

### 3. การ Redirect ไม่ทำงาน
- Cross-origin redirect ต้องใช้ postMessage เท่านั้น
- ไม่สามารถ redirect โดยตรงจาก iframe ได้

## Browser Support

- Chrome: ✅ Full support
- Firefox: ✅ Full support  
- Safari: ✅ Full support
- Edge: ✅ Full support
- IE11: ⚠️ Limited support (basic postMessage only)