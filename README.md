# Smart Iframe for WordPress

Smart Iframe เป็น JavaScript library ที่ช่วยให้การใช้งาน iframe ใน WordPress มีประสิทธิภาพมากขึ้น พร้อมฟีเจอร์ auto-resize, redirect handling และการจัดการ cross-origin iframe

## 📚 เอกสารทั้งหมด

### สำหรับผู้ใช้ทั่วไป (Non-Technical)
- **[วิธีใช้งานง่าย ๆ](docs/WORDPRESS-SIMPLE.md)** - คู่มือ copy-paste สำหรับคนที่ไม่ใช่โปรแกรมเมอร์

### สำหรับนักพัฒนา (Technical)
- **[WordPress Integration Guide](docs/wordpress-integration.md)** - คู่มือการติดตั้งและพัฒนา plugin แบบละเอียด

## ✨ Features

- 🔄 **Auto-Resize**: ปรับขนาดความสูง iframe อัตโนมัติตามเนื้อหา
- 🚀 **Auto-Redirect**: จัดการ redirect จาก iframe ไปยังหน้าหลักอัตโนมัติ
- 🛡️ **Cross-Origin Support**: ทำงานได้กับ iframe จากเว็บไซต์ภายนอก
- ⚡ **Performance Optimized**: โหลดเร็ว ใช้ทรัพยากรน้อย
- 🎯 **Easy Integration**: ติดตั้งง่าย ใช้งานง่าย

## 🚀 Quick Start

ต้องการเริ่มใช้งานเลย? เลือกตามความต้องการของคุณ:

- **ผู้ใช้ทั่วไป**: อ่าน [วิธีใช้งานง่าย ๆ](docs/WORDPRESS-SIMPLE.md) - เพียง 3 ขั้นตอน copy-paste
- **นักพัฒนา**: อ่าน [WordPress Integration Guide](docs/wordpress-integration.md) - สร้าง plugin และปรับแต่งขั้นสูง

## 📦 Installation

### วิธีที่ 1: CDN (แนะนำ)

เพิ่มโค้ดใน WordPress theme หรือ child theme:

```php
// ใน functions.php
function enqueue_smart_iframe() {
    wp_enqueue_script(
        'smart-iframe',
        'https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe.min.js',
        array(),
        '1.0.0',
        true
    );
}
add_action('wp_enqueue_scripts', 'enqueue_smart_iframe');
```

### วิธีที่ 2: WordPress Plugin

สร้างไฟล์ `smart-iframe-plugin.php`:

```php
<?php
/**
 * Plugin Name: Smart Iframe
 * Description: Advanced iframe management with auto-resize and redirect handling
 * Version: 1.0.0
 * Author: Your Name
 */

if (!defined('ABSPATH')) {
    exit;
}

class SmartIframePlugin {
    
    public function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_shortcode('smart_iframe', array($this, 'smart_iframe_shortcode'));
    }
    
    public function enqueue_scripts() {
        wp_enqueue_script(
            'smart-iframe',
            'https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe.min.js',
            array(),
            '1.0.0',
            true
        );
    }
    
    public function smart_iframe_shortcode($atts) {
        $atts = shortcode_atts(array(
            'src' => '',
            'height' => '800',
            'max_height' => '9000',
            'min_height' => '400',
            'allow_resize' => 'true',
            'allow_redirect' => 'true',
            'title' => 'Smart Iframe'
        ), $atts);
        
        if (empty($atts['src'])) {
            return '<p>Error: Smart Iframe src is required</p>';
        }
        
        return sprintf(
            '<div data-smart-iframe="%s" 
                  data-initial-height="%s"
                  data-max-height="%s" 
                  data-min-height="%s"
                  data-allow-resize="%s" 
                  data-allow-redirect="%s"
                  data-title="%s">
             </div>',
            esc_url($atts['src']),
            esc_attr($atts['height']),
            esc_attr($atts['max_height']),
            esc_attr($atts['min_height']),
            esc_attr($atts['allow_resize']),
            esc_attr($atts['allow_redirect']),
            esc_attr($atts['title'])
        );
    }
}

new SmartIframePlugin();
?>
```

## 🚀 Usage

### วิธีที่ 1: HTML ตรงใน WordPress

```html
<div data-smart-iframe="https://example.com/form" 
     data-initial-height="800"
     data-max-height="9000" 
     data-min-height="400"
     data-allow-resize="true" 
     data-allow-redirect="true"
     data-title="Contact Form">
</div>
```

### วิธีที่ 2: WordPress Shortcode

```
[smart_iframe src="https://example.com/form" height="800" max_height="9000" title="Contact Form"]
```

### วิธีที่ 3: Gutenberg Block

สร้าง Custom HTML Block และใส่:

```html
<div data-smart-iframe="https://example.com/form" 
     data-initial-height="800"
     data-max-height="9000">
</div>
```

## ⚙️ Configuration Options

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-smart-iframe` | - | URL ของ iframe (required) |
| `data-initial-height` | `200` | ความสูงเริ่มต้น (px) |
| `data-max-height` | `null` | ความสูงสูงสุด (px) |
| `data-min-height` | `200` | ความสูงต่ำสุด (px) |
| `data-allow-resize` | `true` | อนุญาตให้ปรับขนาดอัตโนมัติ |
| `data-allow-redirect` | `true` | อนุญาตให้ redirect |
| `data-allow-events` | `true` | อนุญาต custom events |
| `data-scrolling` | `no` | iframe scrolling attribute |
| `data-sandbox` | `allow-scripts allow-same-origin allow-forms` | iframe sandbox |
| `data-title` | `Smart Iframe` | iframe title สำหรับ accessibility |

## 🎯 Use Cases

### 1. Contact Forms
```html
<div data-smart-iframe="https://forms.example.com/contact" 
     data-initial-height="600"
     data-max-height="1200"
     data-title="Contact Form">
</div>
```

### 2. Payment Forms
```html
<div data-smart-iframe="https://payment.example.com/checkout" 
     data-initial-height="800"
     data-allow-redirect="true"
     data-title="Payment Form">
</div>
```

### 3. Survey Forms
```html
<div data-smart-iframe="https://survey.example.com/form" 
     data-initial-height="500"
     data-max-height="2000"
     data-title="Survey Form">
</div>
```

### 4. Booking Systems
```html
<div data-smart-iframe="https://booking.example.com/calendar" 
     data-initial-height="700"
     data-max-height="1500"
     data-title="Booking Calendar">
</div>
```

## 📊 Event Handling

สำหรับ developers ที่ต้องการ custom functionality:

```javascript
// Iframe พร้อมใช้งาน
window.smartIframes.on('iframe:ready', function(data) {
    // Handle iframe ready
});

// Iframe ปรับขนาดแล้ว
window.smartIframes.on('iframe:resize', function(data) {
    // Handle resize event
    // data.height, data.width, data.method
});

// Iframe redirect แล้ว
window.smartIframes.on('iframe:redirect', function(data) {
    // Handle redirect event
    // data.url, data.target
});

// ตรวจพบ redirect
window.smartIframes.on('iframe:redirect-detected', function(data) {
    // Handle redirect detection
    // data.newUrl, data.oldUrl, data.redirectCount
});
```

## 🛡️ Security Features

1. **URL Validation**: ตรวจสอบ URL ที่ปลอดภัยเท่านั้น
2. **Sandbox Protection**: ใช้ iframe sandbox attributes
3. **Cross-Origin Handling**: จัดการ cross-origin อย่างปลอดภัย
4. **Referrer Policy**: ป้องกันการรั่วไหลของข้อมูล referrer

## 🚨 Troubleshooting

### ปัญหา: Iframe ไม่ปรับขนาดอัตโนมัติ

**วิธีแก้**:
1. ตรวจสอบว่า `data-allow-resize="true"`
2. เพิ่ม `data-initial-height` ที่เหมาะสม
3. ตั้งค่า `data-max-height` ให้เพียงพอ

### ปัญหา: Redirect ไม่ทำงาน

**วิธีแก้**:
1. ตรวจสอบว่า `data-allow-redirect="true"`
2. ตรวจสอบ URL ใน query parameter `redirect=`
3. ตรวจสอบ console errors

### ปัญหา: Cross-Origin Errors

**วิธีแก้**:
1. เพิ่ม appropriate CORS headers ที่ iframe source
2. ใช้ `data-sandbox` attributes ที่เหมาะสม
3. ตรวจสอบ referrer policy

## 📈 Performance Tips

1. **Lazy Loading**: ใช้ `loading="lazy"` (เปิดอัตโนมัติ)
2. **Initial Height**: ตั้งค่า `data-initial-height` ให้ใกล้เคียงกับขนาดจริง
3. **Max Height**: จำกัด `data-max-height` ให้เหมาะสม
4. **CDN**: ใช้ CDN สำหรับ smart-iframe.min.js

## 🔧 Advanced Configuration

### Custom CSS

```css
.smart-iframe {
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.smart-iframe.loading {
    background: url('loading-spinner.gif') center no-repeat;
}
```

### WordPress Hooks

```php
// เพิ่ม custom attributes
add_filter('smart_iframe_attributes', function($attributes, $atts) {
    $attributes['data-custom'] = 'value';
    return $attributes;
}, 10, 2);

// Modify script loading
add_filter('smart_iframe_script_url', function($url) {
    return 'https://custom-cdn.com/smart-iframe.min.js';
});
```

## 📝 License

MIT License - ใช้งานได้ฟรีสำหรับโปรเจกต์ทุกประเภท

## 📖 เอกสารเพิ่มเติม

- **[วิธีใช้งานง่าย ๆ](docs/WORDPRESS-SIMPLE.md)** - สำหรับคนที่ไม่ใช่โปรแกรมเมอร์ (3 ขั้นตอน copy-paste)
- **[WordPress Integration Guide](docs/wordpress-integration.md)** - สำหรับนักพัฒนา (plugin, blocks, security)

## 🆘 Support

สำหรับการสนับสนุนและคำถาม:
- GitHub Issues: [Repository Issues](https://github.com/minkbear/smart-iframe/issues)
- Documentation: [Full Documentation](https://github.com/minkbear/smart-iframe/wiki)