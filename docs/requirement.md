# Smart Iframe v2 Requirements

## Core Workflow (ตามที่ตกลงกัน)

1. **เข้า main page** → ยังไม่ redirect (✅ เสร็จแล้ว)
2. **Submit form ใน iframe** → iframe-injector.js ต้องส่ง `FORM_SUBMIT` message (🔄 กำลังแก้)
3. **ถ้า submit ไม่ error** → iframe redirect ตาม "redirect" parameter → main page redirect ตาม iframe (⏳ รอ step 2)

## Technical Implementation

### iframe-injector.js ต้องส่ง postMessage กรณีเหล่านี้:

#### 1. `FORM_SUBMIT` (📝 สำคัญที่สุด)
- **ต้องส่งเมื่อ**: User click submit button หรือ form ถูก submit
- **ปัญหาปัจจุบัน**: ไม่เจอ message นี้ใน console logs
- **Button ที่ต้อง detect**: `<button type="submit" class="btn green btn-loading">ส่งข้อมูล</button>`

#### 2. `IFRAME_URL_UPDATE` (🔄 ทำงานแล้ว)
- ส่งเมื่อ URL เปลี่ยน
- ใช้สำหรับ detect การ redirect หลัง form submit

#### 3. `VALIDATION_ERROR_DETECTED` (⚠️ ทำงานแล้ว)
- ส่งเมื่อเจอ validation errors

## Current Status

### ✅ Working
- Sandbox permissions (`allow-top-navigation-by-user-activation`)
- URL parameter priority (`redirect` > `return` > `p`)
- URL change detection (ไม่ redirect เมื่อ initial load)
- Main page รอ form submission ถูกต้องตาม requirement

### 🔄 In Progress
- iframe-injector.js form detection
- ต้อง deploy enhanced version ไปที่ `https://app.ofonline.net/js/iframe-injector.js`

### ⏳ Pending
- Test กับ form submission จริง
- Verify redirect flow ทำงานครบวงจร

## File Locations

- **Main Script**: `dist/smart-iframe-v2.min.js` (CDN: jsdelivr)
- **Iframe Script**: `iframe-injector.js` → ต้อง deploy ไปที่ iframe domain
- **Test Files**: `test-*.html` สำหรับ debug

# อ้างอิง Reference Implementation

- **iframe script**: https://cdn.pdx-1.pipedriveassets.com/leadbooster-chat/assets/web-forms/app.min.js?v=1ac041c_17261573348
- **main page**: https://webforms.pipedrive.com/f/loader
- **ตัวอย่าง code ใน pipedrive**:
```HTML
<div class="pipedriveWebForms" data-pd-webforms="https://webforms.pipedrive.com/f/31klnpxRYZ1WyJKuBqkQspW2OtjFjiAIDS3GzbREKv049kTNSZNDe99EeyYwRNgqv"><script src="https://webforms.pipedrive.com/f/loader"></script></div>
```

## Smart Iframe v2 Implementation

```html
<div class="smartIframe" 
     data-src="https://app.ofonline.net/careers/?p=position&redirect=https://domain.com/thank-you.html"
     data-allow-redirect="true"
     data-allow-resize="true"
     data-cross-origin="true">
</div>
<script src="https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe-v2.min.js"></script>
```

**iframe domain** ต้องมี:
```html
<script src="https://app.ofonline.net/js/iframe-injector.js"></script>
```