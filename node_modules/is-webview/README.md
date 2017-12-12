# is-webview

> JavaScript WebView detection for Node and the browser.

Sometimes you need to know if a **DOM document** or an **HTTP request** is performed by a UIWebView/WebView or not.
Especially to serve a more *contextualised experience* or to *dynamically load* components.

WebView detection is twofold:
- Browser features and properties;
- User-Agent sniffing.

# Install

```bash
npm install --save is-webview
```

The library is [browserify]() and [webpack]() friendly. Use them!

# Usage in Node

```js
var iswebview = require('is-webview');

module.exports = function(req, res, next){
  if (iswebview(req.headers['User-Agent'])) {
    // set-up whatever is needed for a WebView
    // ...
    next();
  }
};
```

# Usage in the browser

```js
if (isWebview(navigator.userAgent)) {
  // do whatever is needed for a WebView display
  // ...
};
```

# API

## `iswebview(userAgent)`

- `userAgent` (String): Browser User-Agent header string

Detects a WebView from browser properties (if available) and from a User-Agent string.

```js
if (iswebview(navigator.userAgent)) {
  // ...
}
```

## `iswebview(userAgent, configObject)`

- `userAgent` (String): Browser User-Agent header string
- `configObject` (Object): see below.

Detects a WebView from a custom User-Agent string, browser properties (if available) and fallbacks to regular User-Agent string.

```js
if (iswebview(navigator.userAgent, { appName: 'FooBar' })) {
  // ...
}
```

# configObject

A configuration object conveys cues to assist the detection:

- `appName` (String): the app name explicitly set in your WebView properties/settings.


# Sources

- http://stackoverflow.com/questions/4460205/detect-ipad-iphone-webview-via-javascript
- http://blogs.msdn.com/b/wsdevsol/archive/2012/10/18/nine-things-you-need-to-know-about-webview.aspx
- http://stackoverflow.com/questions/19404974/how-to-detect-if-using-android-browser-or-android-native-webview-client
- http://stackoverflow.com/questions/16383776/detect-in-app-browser-webview-with-php-javascript
- http://stackoverflow.com/a/10348353/103396
- http://stackoverflow.com/a/21633431/103396

# Licence

> Copyright 2014 British Broadcasting Corporation
>
> Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at
>
> http://www.apache.org/licenses/LICENSE-2.0
>
> Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.