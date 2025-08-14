# WordPress Integration Guide - Smart Iframe

คู่มือการติดตั้งและใช้งาน Smart Iframe ใน WordPress แบบละเอียด

## 🎯 Quick Start (5 นาที)

### Step 1: เพิ่ม Script ใน WordPress

เลือกวิธีใดวิธีหนึ่ง:

**วิธี A: ใส่ใน functions.php**
```php
// เพิ่มในไฟล์ wp-content/themes/your-theme/functions.php
function load_smart_iframe() {
    wp_enqueue_script(
        'smart-iframe',
        'https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe.min.js',
        array(),
        '1.0.0',
        true
    );
}
add_action('wp_enqueue_scripts', 'load_smart_iframe');
```

**วิธี B: ใช้ Plugin (Code Snippets)**
```php
// ติดตั้ง plugin "Code Snippets" แล้วเพิ่มโค้ดนี้
wp_enqueue_script(
    'smart-iframe',
    'https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe.min.js',
    array(),
    '1.0.0',
    true
);
```

### Step 2: ใช้งานใน WordPress

**ใน Post/Page (HTML Block):**
```html
<div data-smart-iframe="https://forms.example.com/contact" 
     data-initial-height="800"
     data-max-height="2000">
</div>
```

## 🔧 เต็มรูปแบบ: สร้าง WordPress Plugin

### สร้างไฟล์ Plugin

สร้างไฟล์ `wp-content/plugins/smart-iframe/smart-iframe.php`:

```php
<?php
/**
 * Plugin Name: Smart Iframe Pro
 * Plugin URI: https://yoursite.com
 * Description: Advanced iframe management with auto-resize and redirect handling for WordPress
 * Version: 1.0.0
 * Author: Your Name
 * License: MIT
 * Text Domain: smart-iframe
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class SmartIframeWordPress {
    
    private $version = '1.0.0';
    private $script_url = 'https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe.min.js';
    
    public function __construct() {
        add_action('init', array($this, 'init'));
    }
    
    public function init() {
        // Enqueue scripts
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        
        // Add shortcodes
        add_shortcode('smart_iframe', array($this, 'shortcode_handler'));
        add_shortcode('iframe_form', array($this, 'form_shortcode'));
        add_shortcode('iframe_payment', array($this, 'payment_shortcode'));
        
        // Add Gutenberg block support
        add_action('enqueue_block_editor_assets', array($this, 'enqueue_block_assets'));
        
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Add settings
        add_action('admin_init', array($this, 'register_settings'));
    }
    
    public function enqueue_scripts() {
        $script_url = get_option('smart_iframe_script_url', $this->script_url);
        
        wp_enqueue_script(
            'smart-iframe',
            $script_url,
            array(),
            $this->version,
            true
        );
        
        // Add inline script for configuration
        $config = array(
            'debug' => WP_DEBUG,
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('smart_iframe_nonce')
        );
        
        wp_localize_script('smart-iframe', 'SmartIframeConfig', $config);
    }
    
    public function shortcode_handler($atts, $content = '') {
        $atts = shortcode_atts(array(
            'src' => '',
            'height' => '800',
            'max_height' => '9000',
            'min_height' => '400',
            'allow_resize' => 'true',
            'allow_redirect' => 'true',
            'allow_events' => 'true',
            'title' => 'Smart Iframe',
            'class' => '',
            'style' => ''
        ), $atts, 'smart_iframe');
        
        // Validate required attributes
        if (empty($atts['src'])) {
            return '<div class="smart-iframe-error">Error: iframe src is required</div>';
        }
        
        // Sanitize attributes
        $src = esc_url($atts['src']);
        $height = intval($atts['height']);
        $max_height = intval($atts['max_height']);
        $min_height = intval($atts['min_height']);
        $title = esc_attr($atts['title']);
        $class = esc_attr($atts['class']);
        $style = esc_attr($atts['style']);
        
        // Build HTML
        $html = sprintf(
            '<div data-smart-iframe="%s" 
                  data-initial-height="%d"
                  data-max-height="%d" 
                  data-min-height="%d"
                  data-allow-resize="%s" 
                  data-allow-redirect="%s"
                  data-allow-events="%s"
                  data-title="%s"
                  class="smart-iframe-container %s"
                  style="%s">
            </div>',
            $src,
            $height,
            $max_height,
            $min_height,
            $atts['allow_resize'],
            $atts['allow_redirect'],
            $atts['allow_events'],
            $title,
            $class,
            $style
        );
        
        return $html;
    }
    
    // Shortcode สำหรับฟอร์ม
    public function form_shortcode($atts) {
        $defaults = array(
            'height' => '600',
            'max_height' => '1500',
            'title' => 'Contact Form'
        );
        
        $atts = shortcode_atts(array_merge($defaults, $atts), $atts, 'iframe_form');
        return $this->shortcode_handler($atts);
    }
    
    // Shortcode สำหรับ payment
    public function payment_shortcode($atts) {
        $defaults = array(
            'height' => '800',
            'max_height' => '1200',
            'title' => 'Payment Form',
            'allow_redirect' => 'true'
        );
        
        $atts = shortcode_atts(array_merge($defaults, $atts), $atts, 'iframe_payment');
        return $this->shortcode_handler($atts);
    }
    
    public function enqueue_block_assets() {
        wp_enqueue_script(
            'smart-iframe-blocks',
            plugin_dir_url(__FILE__) . 'assets/blocks.js',
            array('wp-blocks', 'wp-element', 'wp-editor'),
            $this->version
        );
    }
    
    public function add_admin_menu() {
        add_options_page(
            'Smart Iframe Settings',
            'Smart Iframe',
            'manage_options',
            'smart-iframe-settings',
            array($this, 'admin_page')
        );
    }
    
    public function register_settings() {
        register_setting('smart_iframe_settings', 'smart_iframe_script_url');
        register_setting('smart_iframe_settings', 'smart_iframe_default_height');
        register_setting('smart_iframe_settings', 'smart_iframe_default_max_height');
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>Smart Iframe Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('smart_iframe_settings'); ?>
                <?php do_settings_sections('smart_iframe_settings'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">Script URL</th>
                        <td>
                            <input type="url" 
                                   name="smart_iframe_script_url" 
                                   value="<?php echo esc_attr(get_option('smart_iframe_script_url', $this->script_url)); ?>" 
                                   class="regular-text" />
                            <p class="description">URL ของ smart-iframe.min.js บน S3 หรือ CDN</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Default Height</th>
                        <td>
                            <input type="number" 
                                   name="smart_iframe_default_height" 
                                   value="<?php echo esc_attr(get_option('smart_iframe_default_height', '800')); ?>" 
                                   min="100" max="5000" />
                            <p class="description">ความสูงเริ่มต้น (px)</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Default Max Height</th>
                        <td>
                            <input type="number" 
                                   name="smart_iframe_default_max_height" 
                                   value="<?php echo esc_attr(get_option('smart_iframe_default_max_height', '9000')); ?>" 
                                   min="200" max="20000" />
                            <p class="description">ความสูงสูงสุด (px)</p>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(); ?>
            </form>
            
            <h2>Usage Examples</h2>
            <h3>Basic Iframe</h3>
            <code>[smart_iframe src="https://example.com/form"]</code>
            
            <h3>Contact Form</h3>
            <code>[iframe_form src="https://forms.example.com/contact"]</code>
            
            <h3>Payment Form</h3>
            <code>[iframe_payment src="https://payment.example.com/checkout"]</code>
            
            <h3>Custom Height</h3>
            <code>[smart_iframe src="https://example.com/form" height="600" max_height="1200"]</code>
        </div>
        <?php
    }
}

// Initialize plugin
new SmartIframeWordPress();

// Activation hook
register_activation_hook(__FILE__, function() {
    // Set default options
    add_option('smart_iframe_script_url', 'https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main/dist/smart-iframe.min.js');
    add_option('smart_iframe_default_height', '800');
    add_option('smart_iframe_default_max_height', '9000');
});
?>
```

## 🎨 Gutenberg Block Support

สร้างไฟล์ `wp-content/plugins/smart-iframe/assets/blocks.js`:

```javascript
(function(blocks, element, editor) {
    var el = element.createElement;
    var RichText = editor.RichText;
    
    blocks.registerBlockType('smart-iframe/iframe', {
        title: 'Smart Iframe',
        icon: 'embed-generic',
        category: 'embed',
        attributes: {
            src: {
                type: 'string',
                default: ''
            },
            height: {
                type: 'string',
                default: '800'
            },
            maxHeight: {
                type: 'string', 
                default: '9000'
            },
            title: {
                type: 'string',
                default: 'Smart Iframe'
            }
        },
        
        edit: function(props) {
            var attributes = props.attributes;
            var setAttributes = props.setAttributes;
            
            function onChangeSrc(newSrc) {
                setAttributes({src: newSrc});
            }
            
            function onChangeHeight(newHeight) {
                setAttributes({height: newHeight});
            }
            
            function onChangeMaxHeight(newMaxHeight) {
                setAttributes({maxHeight: newMaxHeight});
            }
            
            function onChangeTitle(newTitle) {
                setAttributes({title: newTitle});
            }
            
            return el('div', {className: 'smart-iframe-block-editor'},
                el('h3', {}, 'Smart Iframe Settings'),
                el('label', {}, 'URL:'),
                el('input', {
                    type: 'url',
                    value: attributes.src,
                    onChange: function(event) {
                        onChangeSrc(event.target.value);
                    },
                    placeholder: 'https://example.com/form'
                }),
                el('label', {}, 'Initial Height:'),
                el('input', {
                    type: 'number',
                    value: attributes.height,
                    onChange: function(event) {
                        onChangeHeight(event.target.value);
                    }
                }),
                el('label', {}, 'Max Height:'),
                el('input', {
                    type: 'number',
                    value: attributes.maxHeight,
                    onChange: function(event) {
                        onChangeMaxHeight(event.target.value);
                    }
                }),
                el('label', {}, 'Title:'),
                el('input', {
                    type: 'text',
                    value: attributes.title,
                    onChange: function(event) {
                        onChangeTitle(event.target.value);
                    }
                }),
                attributes.src ? el('div', {
                    style: {
                        border: '1px solid #ccc',
                        height: attributes.height + 'px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '10px'
                    }
                }, 'Smart Iframe Preview: ' + attributes.src) : null
            );
        },
        
        save: function(props) {
            var attributes = props.attributes;
            
            return el('div', {
                'data-smart-iframe': attributes.src,
                'data-initial-height': attributes.height,
                'data-max-height': attributes.maxHeight,
                'data-title': attributes.title,
                'data-allow-resize': 'true',
                'data-allow-redirect': 'true'
            });
        }
    });
})(
    window.wp.blocks,
    window.wp.element,
    window.wp.editor
);
```

## 📱 Mobile Responsive CSS

เพิ่มใน theme's `style.css` หรือ Customizer:

```css
/* Smart Iframe Responsive Styles */
.smart-iframe-container {
    width: 100%;
    position: relative;
    margin: 20px 0;
}

.smart-iframe {
    width: 100%;
    border: none;
    display: block;
    transition: height 0.3s ease;
}

/* Mobile Optimization */
@media (max-width: 768px) {
    .smart-iframe {
        min-height: 400px;
    }
    
    .smart-iframe-container {
        margin: 15px 0;
    }
}

/* Loading State */
.smart-iframe.loading {
    opacity: 0.7;
    background: #f0f0f0 url('data:image/svg+xml,...') center no-repeat;
}

/* Error State */
.smart-iframe-error {
    padding: 20px;
    background: #ffebee;
    border: 1px solid #f44336;
    color: #c62828;
    border-radius: 4px;
    text-align: center;
}
```

## 🔒 Security Best Practices

### Content Security Policy

เพิ่มใน `.htaccess` หรือ security plugin:

```apache
# Allow Smart Iframe
Header set Content-Security-Policy "frame-src https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main https://trusted-iframe-sources.com; script-src 'self' https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main"
```

### WordPress Security

```php
// เพิ่มใน functions.php สำหรับ security
function smart_iframe_security_headers() {
    header('X-Frame-Options: SAMEORIGIN');
    header('X-Content-Type-Options: nosniff');
}
add_action('send_headers', 'smart_iframe_security_headers');

// Sanitize iframe URLs
function validate_iframe_url($url) {
    $allowed_domains = array(
        'forms.example.com',
        'payment.example.com',
        'survey.example.com'
    );
    
    $parsed = parse_url($url);
    if (!in_array($parsed['host'], $allowed_domains)) {
        return false;
    }
    
    return true;
}
```

## 🚀 Performance Optimization

### Lazy Loading

```php
// เพิ่มใน functions.php
function optimize_smart_iframe() {
    ?>
    <script>
    // Lazy load iframes
    if ('IntersectionObserver' in window) {
        const iframeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const container = entry.target;
                    if (!container.querySelector('iframe')) {
                        // Initialize Smart Iframe only when visible
                        window.smartIframes.createSmartIframe(container);
                    }
                    iframeObserver.unobserve(container);
                }
            });
        });
        
        document.querySelectorAll('[data-smart-iframe]').forEach(container => {
            iframeObserver.observe(container);
        });
    }
    </script>
    <?php
}
add_action('wp_footer', 'optimize_smart_iframe');
```

### CDN Configuration

```php
// เพิ่ม preconnect สำหรับ performance
function smart_iframe_preconnect() {
    echo '<link rel="preconnect" href="https://cdn.jsdelivr.net/gh/minkbear/smart-iframe@main">';
    echo '<link rel="dns-prefetch" href="//cdn.jsdelivr.net">';
}
add_action('wp_head', 'smart_iframe_preconnect');
```

## 🧪 Testing

### Debug Mode

```php
// เพิ่มใน wp-config.php สำหรับ testing
if (WP_DEBUG) {
    function smart_iframe_debug() {
        ?>
        <script>
        // Debug Smart Iframe
        window.smartIframes.on('iframe:ready', function(data) {
            console.log('Smart Iframe Ready:', data);
        });
        
        window.smartIframes.on('iframe:error', function(data) {
            console.error('Smart Iframe Error:', data);
        });
        </script>
        <?php
    }
    add_action('wp_footer', 'smart_iframe_debug');
}
```

## 📊 Analytics Integration

```javascript
// เพิ่ม Google Analytics tracking
window.smartIframes.on('iframe:redirect', function(data) {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'iframe_redirect', {
            'event_category': 'Smart Iframe',
            'event_label': data.url,
            'value': 1
        });
    }
});

window.smartIframes.on('iframe:resize', function(data) {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'iframe_resize', {
            'event_category': 'Smart Iframe', 
            'event_label': data.height + 'px',
            'value': data.height
        });
    }
});
```

---

**🎉 เสร็จสิ้น! WordPress พร้อมใช้งาน Smart Iframe แล้ว**

สำหรับคำถามและการสนับสนุน กรุณาติดต่อทีมพัฒนา