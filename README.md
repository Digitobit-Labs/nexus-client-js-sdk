# Nexus JS SDK

Nexus JS SDK is a lightweight browser client for context-aware abuse protection. It collects interaction and environment signals, sends them to the Nexus Guard API, and handles allow, challenge, or deny responses.

## Features

* Programmatic initialization with safe config merging
* Backward-compatible script tag mode
* Manual lifecycle control with `window.NEXUS_DISABLE_AUTO_INIT`
* Automatic form protection
* Hidden field action support via `name="nexus_action"`
* Manual execution for SPA and API-first integrations

## Installation

Include the SDK in your page:

```html
<script src="nexus_client_js_sdk_v_1.0.0.js"></script>
```

## Official Usage Patterns

### A. Script Tag Mode (No-code)

```html
<script
  src="nexus_client_js_sdk_v_1.0.0.js"
  data-sitekey="pk_xxx"
  data-auto="form">
</script>
```

Add `data-nexus-action` to any protected form:

```html
<form data-nexus-action="contact.submit">
  <input name="name" required>
  <button type="submit">Send</button>
</form>
```

### B. Developer Mode (Recommended)

```html
<script src="nexus_client_js_sdk_v_1.0.0.js"></script>
<script>
document.addEventListener("DOMContentLoaded", () => {
  Nexus.init({
    siteKey: "pk_xxx",
    endpoint: "https://nexus.digitobit.com/v1/guard/token",
    auto: true,
    debug: false
  });
});
</script>
```

This mode keeps the SDK explicit while still enabling automatic form binding.

### C. Full Manual Mode (Advanced)

```html
<script>
window.NEXUS_DISABLE_AUTO_INIT = true;
</script>
<script src="nexus_client_js_sdk_v_1.0.0.js"></script>
<script>
Nexus.config.siteKey = "pk_xxx";

const res = await Nexus.execute("login.submit");
</script>
```

This mode makes no initialization-time DOM assumptions and is useful for SPAs, framework apps, and API-first flows.

## Initialization

`Nexus.init()` accepts an optional config object:

```javascript
Nexus.init({
  siteKey: "pk_xxx",
  auto: true,
  guard: "page.view",
  mode: "auto",
  debug: true
});
```

Supported config keys:

* `siteKey`
* `endpoint`
* `auto`
* `guard`
* `mode` with `auto` or `manual`
* `debug`

Behavior notes:

* Config is merged key-by-key instead of replacing the whole config object.
* Script tag `data-*` values still work as a fallback.
* `mode: "manual"` disables automatic form binding and page guard setup.
* Re-running `Nexus.init()` after successful initialization is ignored with a warning.

## Manual Execution

You can execute a request without form binding:

```javascript
const res = await Nexus.execute("custom.action");
console.log(res);
```

`siteKey` must be present before execution. If it is missing, `Nexus.execute()` throws an error.

You can also override the action dynamically:

```javascript
const res = await Nexus.execute(null, {
  action: "dynamic_action_name"
});
```

## Form Action Resolution

In automatic form mode, action is resolved in this order:

1. `data-nexus-action`
2. hidden or visible field with `name="nexus_action"`
3. error if neither is present

Example:

```html
<form>
  <input type="hidden" name="nexus_action" value="signup.submit">
  <input name="email" type="email" required>
  <button type="submit">Join</button>
</form>
```

## Challenge Types

The SDK supports:

* `delay`
* `image`
* `sequence_memory`
* `arithmetic`
* `emoji_count`
* `reverse_text`

Challenges are rendered automatically for form and guard flows.

## Backend Contract

The client remains an untrusted signal generator:

* No secrets are exposed in the SDK
* `action` stays explicit for the `/verify` contract
* Payload integrity and attestation flow remain unchanged

Expected backend responses:

* `ok`
* `challenge`
* `denied`

## Development Notes

* Serve over HTTP or HTTPS, not `file://`
* Enable CORS on the backend when needed
* Use `debug: true` during integration if you want SDK logs

## License

MIT License © Digitobit

## Author

Digitobit

## Developed By

Neeraj Mourya
