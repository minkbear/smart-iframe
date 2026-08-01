# Smart Iframe v3 — Inertia SPA Support

v3 ทำมาสำหรับหน้า iframe ที่เป็น **Inertia SPA** (AdonisJS + Vue + Inertia, Laravel + Inertia ฯลฯ)
ซึ่ง v2 ใช้ไม่ได้ เพราะ Inertia submit form ผ่าน XHR + `history.pushState` — ไม่มี page reload,
ไม่มี URL query params บอก validation error

- เว็บที่เป็น **Laravel MPA (Blade) เดิม → ใช้ v2 ต่อไป** (ไม่ต้องเปลี่ยนอะไร)
- เว็บที่เป็น **Inertia SPA → ใช้ v3 คู่ใหม่นี้**

Protocol ฉบับเต็ม: [docs/PROTOCOL-V3.md](docs/PROTOCOL-V3.md)

## ไฟล์

| ไฟล์ | ใช้ที่ไหน | หน้าที่ |
|---|---|---|
| `dist/smart-iframe-v3.min.js` | หน้า parent (เว็บลูกค้า) | สร้าง iframe, รับ postMessage, resize/redirect |
| `dist/iframe-injector-v3.min.js` | หน้า iframe (แอป Inertia) | **แบบที่ 1**: script tag เดียว ไม่ต้องแก้โค้ดแอป |
| `dist/smart-iframe-inertia.min.js` | หน้า iframe (แอป Inertia) | **แบบที่ 2**: ES module hook `router.on()` ตรง ๆ |

ในหน้า iframe เลือกใช้ **แบบใดแบบหนึ่งเท่านั้น** (ทั้งคู่มี `window.__SIF3__` guard กันซ้ำ)

## วิธีใช้ — ฝั่ง parent (เว็บลูกค้า)

เหมือน v2 ทุกอย่าง แค่เปลี่ยนไฟล์ script:

```html
<script src="https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe-v3.min.js"></script>

<div class="smartIframe"
     data-src="https://app.example.com/careers/?redirect=https://customer-site.com/thank-you.html"
     data-initial-height="800"
     data-max-height="3000"
     data-debug-mode="false"></div>
```

> 💡 ตัวอย่างใช้ `@main` เพื่อให้ได้ไฟล์ล่าสุดเสมอ — สำหรับ **production** แนะนำ pin เป็น commit hash
> (เช่น `@abc1234`) แบบเดียวกับ `extra-scripts/iframe-params.js` เพื่อไม่ให้เว็บลูกค้าโดน
> อัปเดตโดยไม่ตั้งใจ (jsdelivr cache `@main` ไว้สูงสุด 12 ชม. ด้วย)

Attributes ที่รองรับ: `data-src`, `data-allow-resize`, `data-allow-redirect`, `data-allow-events`,
`data-min-height`, `data-max-height`, `data-initial-height`, `data-scrolling`, `data-sandbox`,
`data-title`, `data-iframe-origin` (override origin check), `data-submit-timeout` (ms, default 30000),
`data-debug-mode`

Attributes ของ v2 ที่ **ตัดออก** ใน v3: `data-laravel-mode`, `data-validation-detection`,
`data-error-params`, `data-success-params`, `data-success-patterns`, `data-error-patterns`

### ทางเลือก: ฝังผ่าน `extra-scripts/iframe-params.js` (แบบที่เว็บลูกค้าใช้ใน production)

ถ้าไม่อยากให้เว็บลูกค้าเขียน `.smartIframe` เอง ใช้ helper ตัวนี้แทน — มันจะสร้าง container
ให้อัตโนมัติ พร้อมความสามารถเพิ่ม:

- **ส่งต่อ query params ของหน้าเว็บลูกค้าเข้า iframe URL** (เช่น `?utm_source=...`, `?p=...`)
- ถ้าไม่มี params เลย จะใส่ `redirect=<thank-you ของเว็บลูกค้า>` เป็น default ให้
- `data-base-src` — override URL ฟอร์มปลายทาง (default: careers ของ OF)
- `data-max-width` — บีบความกว้าง iframe (กันเมนู desktop ของเว็บใน iframe โผล่)

ฝั่งเว็บลูกค้าวางแค่นี้:

```html
<div id="iframe-container"
     data-base-src="https://ofkong.ofonline.net/careers"
     data-max-width="700"></div>
<script src="https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@<commit>/extra-scripts/iframe-params.js"></script>
```

> ⚠️ **สถานะปัจจุบัน**: `iframe-params.js` ยังโหลด `smart-iframe-v2.min.js` (pin commit `febc6ee`)
> การย้ายเว็บลูกค้ามา v3 = แก้บรรทัด `script.src` ใน `iframe-params.js` ให้ชี้
> `dist/smart-iframe-v3.min.js` (pin commit ใหม่) แล้ว pin commit ของ `iframe-params.js`
> ใน snippet ฝั่งเว็บลูกค้าตาม — ทำหลัง verify กับแอปจริงแล้วเท่านั้น (ดูแผน migration ท้ายเอกสาร)

### Redirect หลัง submit สำเร็จ

ใส่ query param `redirect` (หรือ `return` / `p`) ใน `data-src` เหมือน v2
เงื่อนไข redirect: มีการ submit form (non-GET Inertia visit) → Inertia ตอบกลับสำเร็จ
(ไม่มี `props.errors`) → **URL ใน iframe เปลี่ยน** → parent redirect ไปที่ URL ใน param

- Validation error → ไม่ redirect, ได้ event `iframe:validation-error` แทน
- Submit สำเร็จแต่ URL เดิม (เช่น flash message หน้าเดิม) → ไม่ redirect (by design)

### Events (ฝั่ง parent)

```js
smartIframeV3.on('iframe:ready',            d => console.log(d));
smartIframeV3.on('iframe:resize',           d => console.log(d.height));
smartIframeV3.on('iframe:navigate',         d => console.log(d.url, d.trigger));
smartIframeV3.on('iframe:form-submit',      d => console.log(d.method, d.url));
smartIframeV3.on('iframe:validation-error', d => console.log(d.errors)); // {field: message}
smartIframeV3.on('iframe:success',          d => console.log(d.url, d.component));
smartIframeV3.on('iframe:redirect',         d => console.log(d.url));
```

## วิธีใช้ — ฝั่ง iframe (แอป AdonisJS + Vue + Inertia)

### แบบที่ 1: Script tag (แนะนำ — ไม่ต้องแก้โค้ดแอป)

ใส่ใน edge layout (เช่น `resources/views/inertia_layout.edge`) ใน `<head>` **ก่อน** app bundle:

```html
<script src="https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/iframe-injector-v3.min.js"></script>
```

ตัว injector จะ patch `XMLHttpRequest`/`fetch` เพื่อจับ request ที่มี `X-Inertia` header
(submit + validation errors + success) และ patch `history.pushState` (navigation)
พร้อมส่งความสูงจริงของ content ผ่าน `ResizeObserver`

### แบบที่ 2: ES module (hook Inertia router ตรง ๆ)

Copy `src/smart-iframe-inertia.js` เข้าโปรเจกต์ แล้วใน entry (`resources/js/app.ts`):

```ts
import { router } from '@inertiajs/vue3'
import { initSmartIframe } from './smart-iframe-inertia'

const teardown = initSmartIframe(router)  // no-op ถ้าไม่ได้อยู่ใน iframe
```

## ⚠️ Cross-origin cookies (สำคัญสำหรับ AdonisJS)

ถ้า iframe เป็นคนละ origin กับ parent, session/CSRF cookie ของ Adonis ต้องตั้ง
`SameSite=None; Secure` ไม่งั้น browser จะไม่ส่ง cookie ใน iframe → POST โดน CSRF reject
ตั้งใน `config/session.ts`:

```ts
cookie: { sameSite: 'none', secure: true }
```

## ทดสอบ

```bash
npm run build:v3

# Terminal 1 — parent site (port 8000)
npm run serve:parent

# Terminal 2 — iframe site (port 8001, รองรับ POST ต่อ fixture)
npm run serve:iframe:v3

# เปิด browser
open http://localhost:8000/tests/v3/test-v3-inertia.html
```

หน้า test มี fake Inertia app (`tests/v3/fake-inertia-app.html`) จำลองพฤติกรรม Inertia
ด้วย XHR/fetch + `X-Inertia` header + pushState โดยไม่ต้องมี backend จริง — ทดสอบได้ครบ:
validation error, success + redirect, pushState nav, ResizeObserver, hard visit (uuid recovery),
multi-iframe correlation และ message spoofing

## Migration จาก v2 (สำหรับหน้า Inertia)

1. Parent: เปลี่ยน script URL จาก `smart-iframe-v2.min.js` → `smart-iframe-v3.min.js`
   (container attributes เดิมใช้ได้ ยกเว้นตัวที่ตัดออกด้านบน)
2. Iframe: เอา `iframe-injector.js` (v2) ออก แล้วใส่ `iframe-injector-v3.min.js` แทน
3. เช็ค cookie `SameSite` ตามหัวข้อด้านบน
