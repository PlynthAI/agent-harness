---
name: mobile-native
description: Make a web app feel native in a phone browser - sticky hover, tap highlight, input zoom, overscroll, safe areas, touch-action. Use when building or reviewing a mobile web app, PWA, bottom sheet, carousel or touch layout. Motion is `design/motion`; mobile web, not React Native or native apps.
---

# Mobile web platform layer

A fix-it method. It does ONE thing: take a web app that feels like a website in a
phone browser and remove, one by one, the tells that give it away.

It is the mobile **web** platform layer - viewport, touch, scroll, safe areas and
the browser chrome. It is not React Native or any native application framework:
those are the project's own stack, and this library carries no counterpart method
for them. Motion is `design/motion`, and reviewing motion after the fact is that
method's review reference.

The project's own authority still decides values. The declarations below are the
platform floor and the reasons behind it; a project with its own baseline, tokens
or conventions keeps them.

## Operating posture

You are a senior design engineer who has shipped drawers, sheets and
gesture-driven UI to real phones and has been burned by every item below. You
know that a desktop browser with the device toolbar on is not a phone. You know
that most "the app feels janky on mobile" reports are not animation problems -
they are a 300ms tap delay, a gray flash on tap, or a hover state that will not
let go.

The user's phone is the source of truth. If you cannot run it on hardware, say
which of the fixes you can verify from code and which need a real device.

Two failure modes, and the first is worse:

1. **Fixing what the desktop shows you.** The bugs here do not reproduce in
   Chrome's device emulation. Test only there and you ship all of them.
2. **Reaching for JavaScript when CSS or a meta tag does it.** Almost every item
   here is one declaration. A touch-detection hook to hide hover states is the
   wrong tool; a media query is the right one.

## Hard rules

1. **Every fix ships with the reason.** Each rule has a *why*. Apply it where the
   why applies, not globally out of habit - `user-select: none` on body text is a
   defect, on a button it is correct.
2. **Media queries over device sniffing.** `(hover: hover)`, `(pointer: fine)`,
   `env()`, `dvh` - the platform tells you what it can do. Never branch on user
   agent strings or screen width to guess at touch.
3. **Touch and mouse are not exclusive.** iPads with trackpads, laptops with
   touchscreens, phones with a mouse. Write for both at once; gate by capability,
   not by device.
4. **Never disable zoom.** `user-scalable=no` and `maximum-scale=1` are
   accessibility failures. Fix the input font size instead, which is what was
   causing the zoom.
5. **Test on hardware before calling it done.** Connect the phone, open the dev
   server by IP, use Safari's Web Inspector or Chrome remote debugging. Emulation
   cannot reproduce sticky hover, tap delay, rubber-banding, safe areas or the
   keyboard.

## The symptom table

Start here. Match what the user is seeing, then read the matching fix in the
reference that owns it. The symptom sets the count: apply the fixes it actually
needs and open only the sections that carry them. An ordinary one-declaration
fix - a tap highlight, an input font size - does not work through the rest of the
list, and most tasks touch one or two rows.

| Problem | Fix |
| --- | --- |
| Hover state stuck after tap | Wrap in `@media (hover: hover) and (pointer: fine)` |
| Gray/blue flash on tap | Kill `-webkit-tap-highlight-color` |
| Layout has the wrong height | `100dvh` (app) or `100svh` (hero) |
| Page zooms into input | Input font size 16px at the minimum |
| Tap feels laggy | Feedback on pointer-down plus `touch-action: manipulation` |
| Pull-to-refresh hijacks scroll | `overscroll-behavior: none` on `html, body` |
| Content stops at the notch | `viewport-fit=cover` plus `env(safe-area-inset-*)` |
| Long-press selects button text | Add `user-select: none` |
| Carousel scrolls vertically | `touch-action: pan-y` on the gesture surface |
| Status bar color does not match | `theme-color` per color scheme |
| Right in Chrome, wrong on phone | Test on real hardware |

The numbered fixes behind these rows live in two references, split by what they
govern. Open the one that holds the matched fix:

- [references/touch-and-tap.md](references/touch-and-tap.md) - fixes 1, 2, 5, 8
  and 9: hover gating, tap highlight, tap delay and press feedback, long-press
  selection, and the gesture axis a carousel owns.
- [references/viewport-and-chrome.md](references/viewport-and-chrome.md) - fixes
  3, 4, 6, 7 and 10: height units, input zoom and the software keyboard,
  overscroll, safe areas, and the status bar colour.

## Baseline

When starting a mobile-facing app, this is the floor. Ship it before the first
component:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0a" />
```

```css
html {
  -webkit-tap-highlight-color: transparent;
  -webkit-text-size-adjust: 100%; /* no font inflation in landscape */
  overscroll-behavior: none;
}

input, textarea, select {
  font-size: 16px;
}

button, a, [role="button"] {
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

@media (hover: hover) and (pointer: fine) {
  /* all :hover rules live here */
}
```

`interactive-widget=resizes-content` opts Chrome on Android back into shrinking
both the visual and the layout viewport when the software keyboard appears, so
`100dvh` and bottom-pinned inputs follow it there. Do not carry that expectation
to iOS or another WebKit browser: they resize the visual viewport only, leave the
layout viewport - and with it `100dvh` - unchanged, and ignore the
`interactive-widget` value, so a bottom-pinned input can still sit behind the
keyboard. Check the target browser and work from its actual behaviour. Drop
`overscroll-behavior: none` from `html` if the app is a scrolling document where
pull-to-refresh is welcome.

## Verify on hardware

Nothing in this method reproduces in device emulation. Sticky hover, the tap
highlight, the URL bar's effect on viewport height, input zoom, the click delay,
overscroll, safe areas and the software keyboard are all real-hardware
behaviours.

- Connect the phone over USB, run the dev server on `0.0.0.0`, open it by the
  machine's LAN IP.
- iOS: Safari's Develop menu, pointing at the device. Android: the browser's
  remote inspection page.
- Test on a phone that is a few years old, not the newest one on your desk. Test
  with the keyboard open. Test in landscape once.
- Test as an installed PWA if that is a target; standalone mode changes viewport,
  safe areas and status bar behaviour.

An OS simulator is a step up from emulation but still misses touch feel. Real
hardware is the bar.

## Never ship

Self-check before you finish.

| Never | Instead |
| --- | --- |
| `user-scalable=no` or `maximum-scale=1` | 16px inputs - fix the cause |
| Ungated `:hover` | `@media (hover: hover) and (pointer: fine)` |
| `100vh` for an app shell or bottom-pinned UI | `100dvh` |
| `100dvh` on a marketing hero | `100svh` (no layout shift on scroll) |
| Press feedback on `click` only | `:active` or `pointerdown` |
| `touchmove` plus `preventDefault()` to stop overscroll | `overscroll-behavior` |
| `user-select: none` on `body` | Only on controls |
| `touch-action: none` on something the user needs to scroll past | `pan-x` or `pan-y` |
| `env(safe-area-inset-*)` without `viewport-fit=cover` | Add the meta tag, or the value is `0` |
| One `theme-color` for both schemes | One per `prefers-color-scheme` |
| User-agent sniffing to detect touch | `(hover)` and `(pointer)` media queries |
| Declaring it fixed from device emulation | Real hardware |

## Output

Apply the fixes. Then, in at most a few lines:

- **What was wrong** - the symptom matched from the table, and the one-line why.
- **What changed** - file and declaration, one line each.
- **What needs a phone** - which fixes you could verify from code and which the
  user can only confirm on hardware.

Do not pad this into a report. The code is the deliverable.

## Hand it on

The fixes are a candidate, not a finished task: they go on to the project's own
checks and to the code review the project already runs. Which items are settled
only on hardware is an evidence limit to report honestly, not a step that blocks
the rest of the work.

## Tone

Opinionated and brief. Most of these are one line; say the line and the reason and
move on. When the honest answer is "I cannot verify this without a device", say
that instead of claiming it is fixed.

## References

- [references/touch-and-tap.md](references/touch-and-tap.md) - hover gating, tap
  highlight, tap delay and press feedback, long-press selection and touch-action
  axes, each with its reason and code.
- [references/viewport-and-chrome.md](references/viewport-and-chrome.md) - height
  units, input zoom and keyboard attributes, overscroll, safe areas and status bar
  colour.
- [Third-party notices](../../../THIRD_PARTY_NOTICES.md) - source pin and licence.
