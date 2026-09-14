# Performance rebuild

The site retains Vite and native JavaScript. The shared initial JavaScript is
56.1 KB (about 44% smaller than the 100.6 KB baseline). WebKit additionally loads
an approximately 7 KB rendering helper when normal-motion travel needs it.
This rebuild replaces the application
controller with independent features, explicit navigation state, cancellable
transitions and a shared camera/renderer. It preserves the existing content,
geometry, five appearances, languages, sound controls, contact flow, drawings,
BIM viewer, territory, capture URLs and static DXF downloads.

## Architecture and cleanup

- Only the city is loaded initially. Network, origin, contact, territory, drawing
  viewers, details and capture helpers load on demand through native imports.
  The lab's geometry is no longer pulled into the city entry through a shared
  projection helper.
- Features own their pending work. Leaving a view cancels its timers; a later
  navigation supersedes an earlier module load or queued territory destination.
- Network opens its overview and selects a person only after an explicit choice.
  Work approaches the US map directly, without the former intermediate zoom-out
  and repositioning. City geometry remains visible as it travels off screen.
- Camera updates use elapsed time and one animation scheduler. During travel,
  a composited HTML layer handles pan/zoom; SVG coordinates are committed at rest.
  Labels retain screen coordinates and interactive geometry remains available. Cached bounds
  avoid layout reads on each frame. Decorative motion is limited to the overview;
  JavaScript sleeps in settled viewers, reduced-motion mode and hidden documents.
- The renderer skips unchanged state. Off-screen scenery is culled only when the
  camera is settled, keeping paint layers stable throughout inward/outward travel.
- Background haze and full-screen optical effects have separate SVG layers.
  Changing camera state no longer repeatedly switches blur on dimmed islands.
  Decorative CSS walkers/beacons pause in reading views and off-screen islands.
  Closed panels become invisible after their exit transition. Live backdrop blur
  was replaced with a matching, more opaque surface so sliding panels do not
  repeatedly resample the moving SVG underneath.
- Drawing and BIM nodes are cached. Selecting another sheet keeps the camera
  still; clicking the selected Foundation sheet does nothing. Mobile fitting
  measures the destination projection, avoiding competing camera corrections
  during the plan animation. Manual projection changes cancel the automatic flip.
- Draft contact fields survive language changes and reopening. Service chips
  update the email immediately. The flow still opens the visitor's email client;
  it does not submit mail to a backend.
- Removed the superseded monolithic controller/geometry module, obsolete motion
  and delegation helpers, unreachable About/Work placeholder content and CTA
  branches, and unused imports/styles. The vector recipes remain in focused
  modules because they provide the site's actual drawings and appearance.
- `ciudad.html` is generated from the same source, with lazy features inlined for
  the standalone Artifact variant. The deployed build keeps separate cacheable
  assets. No runtime dependency was added; Playwright is a development dependency.

## Measurements

The table below describes the intermediate rebuild, before the final Chrome
camera and Safari cache changes. It is not a frame-rate claim for the final build.

Baseline: local commit `32e86c7` (the first Vite refactor). Three sequential runs
per version and viewport, local static servers, cold browser contexts, Chrome
153.0.8010.37 on macOS ARM64, 4× CPU throttling, DPR 1. Desktop: 1440×900;
mobile emulation: 390×844 with touch. Figures below are medians. Raw measurements
are in `docs/performance-results.json`; rerun with `scripts/browser-profile.mjs`.

| Measurement | Baseline | Rebuild |
| --- | ---: | ---: |
| Initial JavaScript, before HTTP compression | 100.6 KB | 53.1 KB |
| Desktop main-thread time during 2 seconds in Services | 1.890 s | 0.149 s |
| Mobile main-thread time during 2 seconds in Services | 1.685 s | 0.139 s |
| Desktop main-thread time during 3 seconds in overview | 2.656 s | 2.770 s |
| Mobile main-thread time during 3 seconds in overview | 2.605 s | 2.572 s |
| Desktop overview frame interval, 95th percentile | 33.4 ms | 16.8 ms |
| Mobile overview frame interval, 95th percentile | 16.8 ms | 16.8 ms |
| Desktop navigation to available menu | 873 ms | 859 ms |
| Mobile navigation to available menu | 882 ms | 1,040 ms |

Initial JavaScript is approximately 47% smaller. Services uses approximately 92%
less main-thread time in these samples, principally because decorative SVG
animations stop while reading. Overview CPU cost and initial readiness did not
show a consistent improvement; the detailed SVG still has a substantial rendering
cost. Frame timings and these local readiness measurements are not Core Web
Vitals or measurements from physical phones/production hosting. They vary with
other machine activity, device/GPU, network and server caching/compression.

The measurement build precedes the final camera/compositing corrections. That
correction keeps all islands available while the camera moves. The final build
also replaces panel backdrop blur with flat surfaces and uses a composited
camera layer during travel. The table is retained as
the measured intermediate build, rather than assigning unmeasured numbers to
those last changes.

## Verification

- `npm run check`: lint, production build and 29 compiled-site integration tests.
  Covers all features, seven capture modes, mobile panel dismissal, hidden/reduced
  motion, rapid navigation, delayed callback cancellation, contact draft/chips,
  drawing callouts, stable sheet selection and outward-transition visibility.
- `npm run test:browser`: actual Chrome tests at desktop and mobile sizes, all
  appearances, drawing sheets/details, BIM toggles, network, both languages,
  origin, territory/typology, contact composition, failed lazy download recovery
  after refresh, and document overflow checks at 320, 768 and 1920 pixels.
  Mobile drawing bounds are checked against the available space above controls.
  Language changes inside a covered sidebar are exercised through keyboard focus.
- 33 comparisons against the baseline confirmed unchanged city geometry, all
  four sheets and annotations, BIM, territory and typology (normalizing generated
  clip IDs and projection styles). Existing DXF files remain byte-for-byte equal.
- The user confirmed that the replacement camera eliminated the reported
  Services-to-city flicker in the local Chrome preview.
- Normal-motion frames were captured in Chrome at DPR 2 (109 desktop and 110
  mobile frames; the SVG camera remained unchanged during outward travel), and the reported local
  Chrome preview was inspected directly during the Services-to-city transition.
- WebKit installation initially timed out; a compatible official WebKit 26.6
  archive (Playwright build 2359) was subsequently obtained. Browser checks use
  that engine; it is not identical to the user's Safari 27 or a physical iPhone.
  Audible output and live FTP hosting were not validated by the automated suite.
- WebKit's desktop/mobile interaction suite passes, including checks that hover
  highlights start no cache jobs, Work's zoom proceeds directly toward the map,
  city geometry stays opaque during that journey, and a detail crop is present.
  It also covers cached outward travel, cancellation, resize, live SVG restoration
  and optional-cache download failure. These assertions are not FPS measurements.
- Additional WebKit checks at DPR 2 cover actual building pointer hover and
  desktop/mobile zoom images. Hover causes no cache rebuilds; sampled building
  zoom detail retains at least 1.5 bitmap pixels per CSS pixel. Intermediate
  images show the city remaining visible during Work entry, and the map is
  present at arrival. These visual checks do not measure native Safari frame rate.

## Safari rendering

WebKit uses a cached overview plus an optional destination-resolution crop during
travel. Each bitmap is limited to approximately four megapixels and a 4096-pixel
edge (eight megapixels total, about 32 MiB of RGBA pixels, excluding browser
overhead). The crop replaces its rectangle in the overview to avoid doubling
translucent shadows. The live SVG supplies sharp geometry and interactions at
rest; WebKit's camera anchor completes with the zoom instead of settling for
additional seconds afterward.

Snapshots reuse the shared stylesheet and embedded local fonts. Content changes,
scene modes, appearance and language invalidate the cache; camera/culling writes
and transient hover classes do not. This avoids expensive snapshot jobs when
the pointer moves between buildings. Resize, navigation cancellation, capture
and reduced-motion changes discard obsolete work; a failed optional cache falls
back to the existing live camera.

Safari keeps decorative haze in the static background and pauses ambient island,
walker and beacon motion. Distant-island blur is disabled in its city
overview. Chrome retains its established camera and decorative motion. Cached
rendering still has preparation and SVG handoff costs: functional checks alone
do not establish smoothness on every device, and user-reported Safari problems
must be checked in normal motion and at high DPR.

## Mobile controls and direct map return — 2026-09-14

Version: the combined source at `c023610`, production entry `index-984HGiRt.js`,
stylesheet `index-DAM0c_6q.css`. Built with Node 26.0.0 and Vite 8.3.0 in an
isolated copy to keep concurrent local edits out of running checks.
`npm run artifact` regenerated the standalone `ciudad.html` from this source.

The decorative flying brand copies, their construction and animation, SVG
container/gradient, unused theme tokens/selectors and obsolete flight test were
removed. The static upper-left brand and its appearance tokens remain intact.
Island/satellite motion, functional geometry and lazy features
retain their existing behavior.

At widths up to 820 CSS pixels the panel grip is a 44-pixel-high button with
English/Spanish accessible labels. Tapping it or dragging downward follows the
current panel's Back action, including returning from a person to the network.
The grip stays reachable while scrolling. Content swipes start only at scroll
position zero and outside interactive controls. Short/cancelled gestures snap
back; content changes, navigation, resize and reduced-motion changes reset a
drag. Contact drafts remain preserved. Only the panel transform changes during
dragging, with its bounds read once at gesture start; this adds no scene capture
or animation scheduler. The combined mobile layout puts 80-pixel-wide profile
portraits beside the name and uses a 96×72 image in About Us. New profiles start
at the top. Detail Back buttons use the translated label's single ×.

Closing Work now calls the city destination once, with a 1400 ms camera journey.
The former intermediate zoom targets and timed route callbacks were removed.
The map remains visible through cache preparation and travel, and leaves the
scene when the camera actually settles. A new destination can interrupt the
return immediately, and resize retargets the current home position. Chrome's
HTML camera layer and WebKit's bounded cache/crop renderer remain unchanged.

`npm run check` passed all 29 integration tests, including short/horizontal
gestures, scrolling, form-field exclusions, pointer-capture release before
touchend, cancellation, translated handles, Back behavior, draft retention and
a direct return that never overshoots or reverses its zoom. The VM harness
models native modulepreload support because its linker already loads the graph;
removing the route timers lets their helper become a deferred shared chunk.

The local QA workflow does not publish. The existing FTP workflow builds and
uploads `dist/` on a push to `main`, which requires explicit permission for that push.

## Responsive panel sizing — 2026-09-14

Layout validation uses the fixed build from `c023610`: `index-984HGiRt.js` and
`index-DAM0c_6q.css` (source CSS SHA-256 prefix `cd610f3320761c12`). The responsive
rules use smaller headings, 15px reading text, compact profile/photo grids,
wrapping metadata, opaque surfaces and safe-area padding. Form inputs use 16px
text and at least 44px height; panel action buttons and service chips also have
44px minimum heights. Drawing/BIM controls use explicit rows, with metadata
beside the title in landscape. New destinations, About Us chapters and Work
mode changes reset the reading position. The detail panel sits above the
drawing toolbar so its Back button can be tapped.

Chrome 153.0.8010.37 and Playwright WebKit 26.6 (build 2359) each passed a separate
layout audit at 320×568, 375×667, 390×844, 430×932, 768×1024, 812×375, 932×430 and
1440×900. DPR was 3 for 390/430 widths and 2 otherwise, with touch/mobile
emulation below 1000px and reduced motion. All 208 panel-state checks passed:
no horizontal overflow; Services, all four drawing sheets, detail dismissal,
BIM controls, network profiles, English/Spanish content, About Us, Work modes,
contact fields and draft retention remained usable. Selected screenshots at
320, 390 and 812px were also reviewed for proportions, image placement and
overlapping panels; these are visual checks, not frame-rate measurements.

At 390×844 both engines measured the AutoCAD toolbar at 324.4 CSS pixels tall
and the first profile at 573.8px. The profile photo is 80×106.7px and sits beside
the name; the About Us image is 96×72px. Long content scrolls inside the sheet.
Raw local screenshots and measurements are in
`/private/tmp/remote-mobile-panels/final/matrix/`.

`npm run check` passed all 29 integration tests and `npm run artifact` regenerated
the standalone page. The final Chrome browser regression pass covered desktop
1440×900 and mobile 390×844 at DPR 2, normal/reduced motion, panel dragging,
navigation, resizing, drawings, BIM and form drafts. Physical phones, the native
Safari version and the on-screen keyboard were not exercised by this emulation.
