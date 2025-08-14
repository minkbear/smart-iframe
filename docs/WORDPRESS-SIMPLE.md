# Smart Iframe สำหรับ WordPress - วิธีใช้งานง่าย ๆ

สำหรับคนที่ไม่ใช่ programmer และต้องการใช้ iframe ที่ปรับขนาดอัตโนมัติใน WordPress

## 🚀 วิธีใช้งาน (3 ขั้นตอน)

### ขั้นตอนที่ 1: Copy โค้ดนี้
```html
<div class="smartIframe" data-src="YOUR_IFRAME_URL_HERE">
    <script src="https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe.min.js"></script>
</div>
```

### ขั้นตอนที่ 2: แทนที่ URL
เปลี่ยน `YOUR_IFRAME_URL_HERE` เป็น URL ของฟอร์มที่ต้องการ

**ตัวอย่าง**:
```html
<div class="smartIframe" data-src="https://forms.google.com/your-form">
    <script src="https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe.min.js"></script>
</div>
```

### ขั้นตอนที่ 3: วางใน WordPress
1. เข้าไปแก้ไข Post/Page ใน WordPress  
2. เพิ่ม **Custom HTML Block**
3. วางโค้ดที่ได้จากขั้นตอนที่ 2
4. กด **Publish** หรือ **Update**

## ✨ เสร็จแล้ว! 

Iframe จะ:
- ปรับขนาดอัตโนมัติตามเนื้อหา
- Redirect ไปหน้าใหม่ได้เมื่อกด Submit
- ทำงานกับฟอร์มจากเว็บไซต์อื่น

---

## 🎯 ตัวอย่างการใช้งานจริง

### Google Forms
```html
<div class="smartIframe" data-src="https://forms.google.com/your-form-id">
    <script src="https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe.min.js"></script>
</div>
```

### Typeform
```html
<div class="smartIframe" data-src="https://your-org.typeform.com/to/your-form">
    <script src="https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe.min.js"></script>
</div>
```

### JotForm
```html
<div class="smartIframe" data-src="https://form.jotform.com/your-form-id">
    <script src="https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe.min.js"></script>
</div>
```

### Contact Form
```html
<div class="smartIframe" data-src="https://yoursite.com/contact-form">
    <script src="https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe.min.js"></script>
</div>
```

### Payment Form
```html
<div class="smartIframe" data-src="https://payment.yoursite.com/checkout">
    <script src="https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe.min.js"></script>
</div>
```

---

## 🔧 ปรับแต่งเพิ่มเติม (ถ้าต้องการ)

### ความสูงเริ่มต้น
```html
<div class="smartIframe" 
     data-src="https://forms.example.com" 
     data-height="600">
    <script src="https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe.min.js"></script>
</div>
```

### ความสูงสูงสุด
```html
<div class="smartIframe" 
     data-src="https://forms.example.com" 
     data-height="600"
     data-max-height="1500">
    <script src="https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe.min.js"></script>
</div>
```

### ปิด Auto-redirect
```html
<div class="smartIframe" 
     data-src="https://forms.example.com" 
     data-redirect="false">
    <script src="https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe.min.js"></script>
</div>
```

---

## 📱 วิธีใส่ใน WordPress (รูปภาพ)

### 1. เพิ่ม Block ใหม่
- กด **+** เพื่อเพิ่ม Block
- เลือก **Custom HTML**

### 2. วางโค้ด
- Copy โค้ด Smart Iframe
- Paste ในช่อง HTML Block

### 3. Preview
- กด **Preview** เพื่อดูผลลัพธ์
- ฟอร์มจะปรับขนาดอัตโนมัติ

### 4. Publish
- กด **Publish** หรือ **Update**
- เสร็จสิ้น!

---

## ❓ ถาม-ตอบ

**Q: ทำไม iframe ไม่ขึ้น?**  
A: ตรวจสอบ URL ว่าถูกต้อง และเว็บไซต์อนุญาตให้ใส่ใน iframe

**Q: สามารถใช้กับ Google Forms ได้ไหม?**  
A: ได้! เปลี่ยน URL ให้เป็น Google Forms URL

**Q: ฟอร์มไม่ redirect หลัง submit**  
A: เพิ่ม `data-redirect="true"` หรือตั้งค่า redirect ในฟอร์มต้นทาง

**Q: ขนาดไม่พอดี**  
A: เพิ่ม `data-height="800"` และ `data-max-height="1500"` (ปรับเลขตามต้องการ)

**Q: ต้องการความช่วยเหลือ?**  
A: ส่งข้อความถึงทีมสนับสนุน พร้อมแนบ URL ของหน้าที่มีปัญหา

---

## ✅ Checklist สำหรับ Copy-Paste

- [ ] Copy โค้ด Smart Iframe  
- [ ] แทนที่ `YOUR_IFRAME_URL_HERE` ด้วย URL จริง
- [ ] เข้าไป WordPress Admin
- [ ] เพิ่ม Custom HTML Block  
- [ ] Paste โค้ด
- [ ] Preview ดูผลลัพธ์
- [ ] Publish/Update

**🎉 เสร็จแล้ว! Iframe จะทำงานอัตโนมัติ**

---

*สำหรับผู้ที่ไม่ใช่ technical แต่ต้องการ iframe ที่ทำงานได้ดี*