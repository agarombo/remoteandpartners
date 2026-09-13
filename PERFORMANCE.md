# Performance rebuild

The site retains Vite and native JavaScript. The shared initial JavaScript is
54.9 KB (about 45% smaller than the 100.6 KB baseline). WebKit additionally loads
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

- `npm run check`: lint, production build and 27 compiled-site integration tests.
  Covers all features, seven capture modes, 60/120 Hz motion, hidden/reduced
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
aircraft, walker and beacon motion. Distant-island blur is disabled in its city
overview. Chrome retains its established camera and decorative motion. Cached
rendering still has preparation and SVG handoff costs: functional checks alone
do not establish smoothness on every device, and user-reported Safari problems
must be checked in normal motion and at high DPR.

The local QA workflow does not publish. The existing FTP workflow builds and
uploads `dist/` on a push to `main`, which requires explicit permission for that push.
