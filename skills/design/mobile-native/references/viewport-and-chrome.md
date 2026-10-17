# Viewport, keyboard and browser chrome

The five fixes behind the layout and scrolling rows of the method's symptom
table: the height that fits the phone, the zoom that fires on focus, the scroll
that escapes the app, the notch, and the status bar. Each ships with its reason.

## 3. Layout has the wrong height

`100vh` on mobile is the *largest* viewport - the height with the browser chrome
collapsed. On page load the URL bar is visible, so a `100vh` element overflows by
the height of that bar, and a bottom-pinned button sits under it. Use the dynamic
and small units instead:

```css
/* App shell, drawers, anything that should track the visible area as chrome shows and hides */
.app { height: 100dvh; }

/* Heroes and first screens - the smallest the viewport gets, so nothing is ever cut off */
.hero { min-height: 100svh; }
```

`dvh` resizes as the URL bar collapses, which is right for an app shell but causes
layout shifts on marketing content mid-scroll. `svh` is stable and never
overflows, which is right for a hero. `lvh` is the old `vh` - you almost never
want it. Keep a `100vh` fallback line above only if the project's support matrix
demands it.

## 4. Page zooms into the input

iOS Safari zooms the page when focus lands on an input whose font size is under
16px, and it does not zoom back out on blur. The user is left looking at a
cropped, drifted layout. That is the reason people reach for `maximum-scale=1`,
which is the wrong fix (hard rule 4).

```css
input, textarea, select {
  font-size: 16px; /* the minimum; 1rem at the default root size */
}
```

If the design calls for smaller text in inputs on desktop, scale it up only where
it matters:

```css
@media (pointer: coarse) {
  input, textarea, select { font-size: 16px; }
}
```

While you are in the inputs, set the keyboard: `inputmode="numeric"` for codes,
`inputmode="decimal"` for amounts, `type="email"` and `type="tel"` for their
fields, `autocapitalize="none"` and `autocorrect="off"` on usernames and codes,
and `enterkeyhint="send"`, `"search"` or `"done"` so the return key says what it
does.

## 6. Pull-to-refresh hijacks scroll

Scrolling past the top of the page triggers pull-to-refresh on Android Chrome and
the whole-page rubber band on iOS. Fine on a document. Wrong in an app with its
own scroll containers, a drawer the user drags down, or a canvas.

```css
html, body {
  overscroll-behavior: none;
}
```

Then, on any inner scrollable - a sheet's content, a chat list, a sidebar - stop
scroll from chaining to the page when it hits the end:

```css
.sheet-content {
  overflow-y: auto;
  overscroll-behavior: contain;
}
```

`contain` keeps the container's own bounce, which feels native, but stops the page
behind it from moving. Use `none` on the root, `contain` on children. Never reach
for a `touchmove` listener with `preventDefault()` for this: it blocks scrolling
entirely and makes the listener non-passive, which costs frames.

## 7. Content stops at the notch

By default the browser letterboxes your page inside the safe area, leaving the
notch, Dynamic Island and home-indicator zones the body's background colour. A
native app paints edge to edge and pads its *content* away from those zones. Two
steps:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

```css
.app-header {
  padding-top: env(safe-area-inset-top);
}
.bottom-bar {
  padding-bottom: env(safe-area-inset-bottom);
}
.sheet {
  padding-bottom: calc(1rem + env(safe-area-inset-bottom));
}
```

`viewport-fit=cover` lets the page under the notch; `env(safe-area-inset-*)` gives
you the insets to pad back out. Without the meta tag the `env()` values are all
`0px`. Fixed headers, bottom tab bars, toasts and sheets are the elements that
need this; ordinary page content usually gets it for free through the header's
padding. Give `env()` a fallback - `env(safe-area-inset-bottom, 0px)` - where the
value is used in a calculation.

## 10. Status bar color does not match

The status bar and the browser chrome take their colour from `theme-color`. One
value means light mode gets a dark bar or dark mode gets a white one. Give each
scheme its own:

```html
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0a" />
<meta name="color-scheme" content="light dark" />
```

Match the value to the colour at the very top of the page - the header
background, not the brand colour. Where the framework owns the document head, set
the tag through the framework's own metadata mechanism instead of hand-writing
the element, and keep the same two media-scoped values. If the app switches theme
with a class rather than the OS setting, update the tag from script on toggle.
For an installed PWA, `apple-mobile-web-app-status-bar-style` and the manifest's
`theme_color` and `background_color` are the same decision.
