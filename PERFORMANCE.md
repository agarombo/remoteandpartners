# Performance refactor

The site now uses Vite with native JavaScript modules. Its interactive SVG city,
content, five appearance options, language and sound controls, contact flow,
drawings, BIM viewer, territory, capture URLs, and static DXF downloads remain.
The FTP host still serves static files; Node is needed only for development/CI.

## Changes

- Split the original inline document into HTML, CSS, content, geometry,
  interactions, and animation scheduling. Vite minifies production output and
  gives assets content hashes so they can be cached independently.
- Extracted all three portraits without recompression. They are requested when
  their panels appear, rather than downloaded inside the initial script.
- Converted the existing Metropolis fonts to WOFF2 and hosted the same IBM Plex
  Mono web subsets locally. Text still uses `font-display: swap`; the external
  Google Fonts stylesheet is no longer required.
- Build the BIM model, territory, and typology DOM only when opened. Reuse the
  same nodes on subsequent visits. Cache the eight combinations of four drawing
  sheets and two languages rather than reconstructing them each time.
- Use one animation scheduler with elapsed-time motion. Slow decorative drift
  updates at most 30 times per second in the overview. Camera transitions retain
  display-rate updates; the city holds steady during travel and while reading.
  Unchanged transforms and hidden labels no longer cause repeated SVG writes.
- Stop the JavaScript loop when a view settles, when the document is hidden,
  and when reduced motion is enabled. Pause hidden CSS animations and honor
  changes to the reduced-motion preference without reloading.
- Delegate scene interactions once, including newly created drawing details,
  instead of attaching more detail handlers on each BIM redraw.
- Removed the unreachable DXF exporter and its conversion helpers, unused
  totals, unused drawing helpers/arguments/translations, the obsolete `pl-*`
  stylesheet, unused ring/line styles, and the superseded `data-theme` rules.
  Existing public DXF files retain their original bytes and URLs.
- Generate `ciudad.html` from the Vite source, preserving the standalone Artifact
  workflow without maintaining a second hand-edited application.

## Measurements

Compared against repository revision `9d62a67`, using the same deterministic
JSDOM harness and simulated 60 Hz clock on both versions. These are source,
payload, DOM, and mutation measurements, **not browser FPS or Core Web Vitals**.
Sizes are decimal KB before HTTP compression.

| Measurement | Before | After |
| --- | ---: | ---: |
| HTML document | 774.8 KB | 11.1 KB |
| HTML + JS + CSS + favicon + every local font subset | At least 774.8 KB¹ | 287.6 KB² |
| Initial DOM elements | 7,890 | 7,186 |
| SVG/DOM `setAttribute` calls in one second of overview drift | 1,920 | 781 |
| `setAttribute` calls in one second of settled services view | 1,952 | 0 |
| `setAttribute` calls in one second of reduced-motion overview | 1,920 | 0 |

¹ The original document already included every portrait; its external IBM Plex
font requests are additional and are not included in this lower bound.

² A conservative total including all language subsets, even those the browser
will not request for English/Spanish. Portraits total 312.1 KB and are additional
when a portrait-containing view opens. This is not a captured network waterfall.

The overview comparison represents roughly 59% fewer attribute writes. It does
not imply 59% faster rendering: SVG rasterization, filters, device/GPU speed,
network conditions, and hosting compression still affect real-world results.

## Verification

`npm run check` passes ESLint, the Vite production build, and 20 integration tests
against the compiled site. Coverage includes four drawing sheets, plan flipping,
section/automation details, BIM discipline toggles, keyboard navigation, both
languages, the network portraits, the contact email, all origin chapters,
territory/typology revisits, reduced motion, visibility changes, resize behavior,
60/120 Hz motion, the standalone Artifact, and all seven capture modes.

A separate comparison against the original page confirmed identical generated
city geometry, all four sheets and their annotations, BIM geometry, territory,
and typology markup (accounting for deferred/cached containers). DXF downloads
are also checked byte-for-byte against `public/DXF/`.

The DOM harness stubs SVG layout measurements and does not render pixels or
play audio. Mobile layout, visual appearance, audible output, browser frame
times, and production hosting behavior still need real-browser verification.
No deployment or live-server configuration was changed during this refactor.

For the next measurement pass, profile a production preview on desktop and a
midrange phone: first load, overview, service zoom, and map transitions. Inspect
paint cost from SVG filters before considering a larger renderer rewrite. Check
hosting compression/cache headers alongside that browser measurement.

References: [Vite assets](https://vite.dev/guide/assets.html),
[Vite static deployment](https://vite.dev/guide/static-deploy.html),
[animation timestamps](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame),
[font delivery](https://web.dev/articles/font-best-practices).
