# Laravel Integration Examples

Real-world examples for Laravel developers using Smart Iframe.

## Contact Form Example

### Laravel Route & Controller

```php
<?php
// routes/web.php
Route::get('/contact', [ContactController::class, 'show']);
Route::post('/contact', [ContactController::class, 'store']);

// app/Http/Controllers/ContactController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    public function show()
    {
        return view('contact.form');
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:20',
            'message' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            // Smart Iframe Laravel detection
            return redirect()->back()
                ->withInput()
                ->withErrors($validator)
                ->with([
                    'status' => 'error',
                    'validation_status' => 'error',
                    'errors' => '1'
                ]);
        }

        // Send email (your business logic)
        try {
            Mail::to('admin@company.com')->send(new ContactMail($request->all()));
            
            // Success redirect for Smart Iframe
            $redirectUrl = $request->get('redirect', route('contact.thank-you'));
            return redirect($redirectUrl)->with([
                'status' => 'success',
                'success' => '1',
                'submitted' => 'true'
            ]);
            
        } catch (\Exception $e) {
            return redirect()->back()
                ->withInput()
                ->with([
                    'status' => 'error',
                    'system_error' => 'Failed to send message. Please try again.'
                ]);
        }
    }
}
```

### Blade Template

```html
{{-- resources/views/contact/form.blade.php --}}
<!DOCTYPE html>
<html>
<head>
    <title>Contact Us</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
</head>
<body>
    {{-- Show Laravel validation errors --}}
    @if(session('status') === 'error' || $errors->any())
        <div class="alert alert-danger">
            @if(session('system_error'))
                {{ session('system_error') }}
            @endif
            
            @foreach($errors->all() as $error)
                <p>{{ $error }}</p>
            @endforeach
        </div>
    @endif

    <form id="contact-form" method="POST" action="{{ route('contact.store') }}">
        @csrf
        
        {{-- Hidden redirect URL for Smart Iframe --}}
        <input type="hidden" name="redirect" value="{{ request('redirect', '/thank-you') }}">
        
        <div class="form-group">
            <label>Name *</label>
            <input type="text" name="name" value="{{ old('name') }}" required>
            @error('name')<span class="error">{{ $message }}</span>@enderror
        </div>

        <div class="form-group">
            <label>Email *</label>
            <input type="email" name="email" value="{{ old('email') }}" required>
            @error('email')<span class="error">{{ $message }}</span>@enderror
        </div>

        <div class="form-group">
            <label>Phone</label>
            <input type="text" name="phone" value="{{ old('phone') }}">
            @error('phone')<span class="error">{{ $message }}</span>@enderror
        </div>

        <div class="form-group">
            <label>Message *</label>
            <textarea name="message" required>{{ old('message') }}</textarea>
            @error('message')<span class="error">{{ $message }}</span>@enderror
        </div>

        <button type="submit">Send Message</button>
    </form>

    {{-- Smart Iframe Integration --}}
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const form = document.getElementById('contact-form');
        
        form.addEventListener('submit', function(e) {
            // Notify parent frame about form submission
            if (window.parent !== window) {
                const urlParams = new URLSearchParams(window.location.search);
                const uuid = urlParams.get('uuid') || 'contact-form';
                
                window.parent.postMessage({
                    type: 'FORM_SUBMIT',
                    uuid: uuid,
                    payload: {
                        formId: 'contact-form',
                        method: 'POST',
                        action: '{{ route("contact.store") }}',
                        formType: 'contact'
                    }
                }, '*');
            }
        });
    });
    </script>
</body>
</html>
```

### Parent Page Implementation

```html
<!DOCTYPE html>
<html>
<head>
    <title>Contact Us - Main Site</title>
</head>
<body>
    <h1>Get In Touch</h1>
    <p>Fill out the form below and we'll get back to you soon.</p>

    {{-- Smart Iframe with Laravel mode - Production Setup --}}
    <div class="smartIframe"
         data-src="https://forms.mycompany.com/contact?redirect=https%3A%2F%2Fmycompany.com%2Fthank-you"
         data-laravel-mode="true"
         data-validation-detection="strict"
         data-error-params="errors,validation_status=error,status=error"
         data-success-params="status=success,success=1,submitted=true"
         data-allow-resize="true"
         data-initial-height="600"
         data-max-height="800">
    </div>

    <script src="smart-iframe.js"></script>
    <script>
        // Monitor form events
        window.smartIframes.on('iframe:form-result', (data) => {
            if (data.success) {
                console.log('Contact form submitted successfully!');
                // Optional: Track analytics event
                // gtag('event', 'form_submit', { form_name: 'contact' });
            } else {
                console.log('Contact form has validation errors');
            }
        });

        window.smartIframes.on('iframe:redirect', (data) => {
            console.log('Redirecting to thank you page:', data.url);
        });
    </script>
</body>
</html>
```

## Newsletter Signup Example

### Laravel Implementation

```php
<?php
// app/Http/Controllers/NewsletterController.php
class NewsletterController extends Controller
{
    public function subscribe(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|unique:subscribers,email',
            'name' => 'required|string|max:100',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withInput()
                ->withErrors($validator)
                ->with('validation_status', 'error');
        }

        // Save subscriber
        Subscriber::create($request->only(['email', 'name']));
        
        return redirect($request->get('redirect', '/newsletter-thanks'))
            ->with('status', 'success');
    }
}
```

### Compact Form Template

```html
{{-- resources/views/newsletter/form.blade.php --}}
<!DOCTYPE html>
<html>
<head>
    <title>Newsletter Signup</title>
    <style>
        body { font-family: Arial; padding: 20px; max-width: 400px; }
        .error { color: red; font-size: 12px; }
        input { width: 100%; padding: 8px; margin: 5px 0; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; }
    </style>
</head>
<body>
    <h3>Subscribe to Our Newsletter</h3>
    
    @if(session('validation_status') === 'error')
        <div style="color: red; background: #ffe6e6; padding: 10px; margin-bottom: 10px;">
            Please fix the errors below.
        </div>
    @endif

    <form id="newsletter-form" method="POST" action="{{ route('newsletter.subscribe') }}">
        @csrf
        <input type="hidden" name="redirect" value="{{ request('redirect') }}">
        
        <input type="text" name="name" placeholder="Your Name" value="{{ old('name') }}" required>
        @error('name')<div class="error">{{ $message }}</div>@enderror
        
        <input type="email" name="email" placeholder="Your Email" value="{{ old('email') }}" required>
        @error('email')<div class="error">{{ $message }}</div>@enderror
        
        <button type="submit">Subscribe</button>
    </form>

    <script>
        document.getElementById('newsletter-form').addEventListener('submit', function() {
            if (window.parent !== window) {
                window.parent.postMessage({
                    type: 'FORM_SUBMIT',
                    payload: { formId: 'newsletter-form', formType: 'newsletter' }
                }, '*');
            }
        });
    </script>
</body>
</html>
```

## Job Application Example

### Laravel Controller with File Upload

```php
<?php
// app/Http/Controllers/JobApplicationController.php
class JobApplicationController extends Controller
{
    public function apply(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'phone' => 'required|string',
            'position' => 'required|string',
            'resume' => 'required|mimes:pdf,doc,docx|max:2048',
            'cover_letter' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withInput()
                ->withErrors($validator)
                ->with([
                    'status' => 'error',
                    'validation_status' => 'error'
                ]);
        }

        try {
            // Store file
            $resumePath = $request->file('resume')->store('resumes', 'public');
            
            // Save application
            JobApplication::create([
                'name' => $request->name,
                'email' => $request->email,
                'phone' => $request->phone,
                'position' => $request->position,
                'resume_path' => $resumePath,
                'cover_letter' => $request->cover_letter,
            ]);

            // Send notification email
            Mail::to('hr@company.com')->send(new NewApplicationMail($request->all()));

            return redirect($request->get('redirect', '/application-received'))
                ->with('status', 'success');

        } catch (\Exception $e) {
            return redirect()->back()
                ->withInput()
                ->with([
                    'status' => 'error',
                    'system_error' => 'Application submission failed. Please try again.'
                ]);
        }
    }
}
```

## Laravel Helper Service

```php
<?php
// app/Services/SmartIframeService.php
namespace App\Services;

use Illuminate\Http\Request;

class SmartIframeService
{
    /**
     * Standard validation error response for Smart Iframe
     */
    public static function validationError($validator, Request $request, array $extraParams = [])
    {
        $defaultParams = [
            'status' => 'error',
            'validation_status' => 'error',
            'errors' => '1'
        ];

        return redirect()->back()
            ->withInput()
            ->withErrors($validator)
            ->with(array_merge($defaultParams, $extraParams));
    }

    /**
     * Standard success response for Smart Iframe
     */
    public static function success(Request $request, $defaultUrl = '/thank-you', array $extraParams = [])
    {
        $redirectUrl = $request->get('redirect', $defaultUrl);
        
        $defaultParams = [
            'status' => 'success',
            'success' => '1',
            'submitted' => 'true'
        ];

        return redirect($redirectUrl)
            ->with(array_merge($defaultParams, $extraParams));
    }

    /**
     * System error response for Smart Iframe
     */
    public static function systemError(Request $request, $message = 'System error occurred')
    {
        return redirect()->back()
            ->withInput()
            ->with([
                'status' => 'error',
                'system_error' => $message,
                'errors' => '1'
            ]);
    }
}
```

### Using the Helper Service

```php
<?php
use App\Services\SmartIframeService;

class ContactController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), $this->rules());

        if ($validator->fails()) {
            return SmartIframeService::validationError($validator, $request);
        }

        try {
            // Your business logic here
            $this->processContact($request);
            
            return SmartIframeService::success($request, '/contact-thank-you');
            
        } catch (\Exception $e) {
            return SmartIframeService::systemError($request, 'Failed to send message');
        }
    }
}
```

## Testing Your Implementation

### Test Script for Laravel Forms

```html
<!DOCTYPE html>
<html>
<head>
    <title>Laravel Smart Iframe Test</title>
</head>
<body>
    <h1>Laravel Integration Test</h1>

    <!-- Production Mode Test (Recommended) -->
    <h2>Test 1: Strict Mode (Production)</h2>
    <div class="smartIframe"
         data-src="https://your-app.com/contact"
         data-laravel-mode="true"
         data-validation-detection="strict">
    </div>

    <!-- Debug Mode Test (Development) -->
    <h2>Test 2: Debug Mode (Development)</h2>
    <div class="smartIframe"
         data-src="https://your-app.com/contact"
         data-laravel-mode="true"
         data-validation-detection="debug">
    </div>

    <!-- Form with pre-existing error (should block redirect) -->
    <h2>Test 3: Form with Validation Error</h2>
    <div class="smartIframe"
         data-src="https://your-app.com/contact?status=error&validation_status=error&errors=1"
         data-laravel-mode="true"
         data-validation-detection="strict">
    </div>

    <script src="smart-iframe.js"></script>
    <script>
        window.smartIframes.on('iframe:debug-info', (data) => {
            console.log('Laravel Test Results:', {
                uuid: data.uuid,
                success: data.debugData.success,
                laravelResult: data.debugData.laravelResult,
                urlParams: data.debugData.urlParams
            });
        });
    </script>
</body>
</html>
```

## Production Deployment Checklist

### ✅ Laravel Application
- [ ] Controllers return proper status parameters
- [ ] Blade templates include postMessage JavaScript
- [ ] Error handling includes Smart Iframe compatibility
- [ ] File upload forms tested with Smart Iframe
- [ ] Email notifications working correctly

### ✅ Parent Site
- [ ] Smart Iframe script loaded
- [ ] Laravel mode configuration correct
- [ ] Error/success parameters match Laravel output
- [ ] Event monitoring implemented (optional)
- [ ] Analytics tracking added (optional)

### ✅ Testing
- [ ] Form validation errors block redirect
- [ ] Successful submissions redirect properly
- [ ] Debug mode shows correct detection method
- [ ] Cross-browser testing completed
- [ ] Mobile responsiveness verified

## Performance Optimization

### Laravel Optimizations
```php
// Cache validation rules
private function getCachedRules()
{
    return Cache::remember('contact_validation_rules', 3600, function() {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            // ... other rules
        ];
    });
}

// Optimize redirect URLs
public function store(Request $request)
{
    // Validate redirect URL for security
    $redirectUrl = $this->validateRedirectUrl($request->get('redirect'));
    
    // ... validation logic
    
    return redirect($redirectUrl)->with('status', 'success');
}
```

### Smart Iframe Optimizations
```html
<!-- Production: Use strict mode for reliable validation detection -->
<div class="smartIframe"
     data-laravel-mode="true"
     data-validation-detection="strict"
     data-validation-timing="200"
     data-error-params="status=error">
</div>

<!-- Development: Use debug mode for troubleshooting -->
<div class="smartIframe"
     data-laravel-mode="true"
     data-validation-detection="debug"
     data-error-params="status=error">
</div>
```

### NEW: Strict Mode Benefits
- **🎯 Production Ready**: No popups, works silently in production
- **⚡ Fast Detection**: Immediately blocks redirects on validation errors
- **🛡️ Reliable**: Compares expected vs actual form results
- **🔧 Maintenance Free**: No manual intervention required