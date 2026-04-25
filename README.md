# Nexus JS SDK

Nexus JS SDK is a lightweight, client-side library for context-aware abuse protection. It collects behavioral, timing, and environment signals from the browser and communicates with the Nexus Guard API to detect bots and enforce adaptive challenges.

---

## Features

* Behavioral signal collection (mouse, keyboard, interaction)
* Timing and latency analysis
* Environment fingerprinting
* Adaptive challenge system (delay, image, arithmetic, etc.)
* Seamless form integration
* Minimal impact on user experience

---

## Installation

Include the SDK in your HTML:

```html
<script
  src="nexus_sdk_v_1.js"
  data-sitekey="YOUR_SITE_KEY"
  data-auto="form">
</script>
```

---

## Basic Usage

### Form Protection

Add `data-nexus-action` to your form:

```html
<form data-nexus-action="contact.submit">
  <input name="name" required>
  <input name="email" required>
  <button type="submit">Send</button>
</form>
```

The SDK will automatically:

1. Intercept form submission
2. Collect signals
3. Request token from backend
4. Render challenge if required
5. Submit form with token

---

### Manual Execution

You can manually trigger protection:

```javascript
const res = await Nexus.execute("custom.action");
console.log(res);
```

---

## Challenge Types

The SDK supports multiple challenge types:

* delay (human interaction timing)
* image (text recognition)
* sequence_memory
* arithmetic
* emoji_count
* reverse_text

Challenges are rendered automatically inside the form.

---

## Configuration

| Attribute    | Description                    |
| ------------ | ------------------------------ |
| data-sitekey | Your Nexus public key          |
| data-auto    | "form" to auto-protect forms   |
| data-guard   | Optional page-level protection |

---

## How It Works

1. SDK collects client signals
2. Sends request to `/v1/guard/token`
3. Server evaluates risk score
4. Returns:

   * token (allowed)
   * challenge (verification required)
   * denied (blocked)

---

## Backend Requirements

Your backend must:

* Accept JSON POST requests
* Return structured responses (ok / challenge / denied)
* Support CORS if used cross-origin

---

## Development Notes

* Ensure SDK is served over HTTP/HTTPS (not file://)
* Enable CORS on backend
* Use console logs for debugging

---

## License

MIT License © Digitobit

---

## Author

Digitobit

---

## Developed By

Neeraj Mourya

---

## Repository

Add your GitHub repository link here.
