# Performance rebuild

The site retains Vite and native JavaScript. This rebuild replaces the application
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
- Camera updates use elapsed time and one animation scheduler. Cached bounds
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

The measurement build precedes the final travel-only culling correction. That
correction keeps all islands available while the camera moves. The final build
also replaces panel backdrop blur with flat surfaces. The table is retained as
the measured intermediate build, rather than assigning unmeasured numbers to
those last changes.

## Verification

- `npm run check`: lint, production build and 26 compiled-site integration tests.
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
- Normal-motion frames were captured in Chrome at DPR 2, and the reported local
  Chrome preview was inspected directly during the Services-to-city transition.
- WebKit installation was attempted but the browser download endpoints timed
  out, including the network-enabled retry. Safari/WebKit and physical devices
  therefore remain unverified. Audible output and live FTP hosting were not
  validated by the automated suite.

No files were pushed or deployed. The existing FTP workflow still builds and
uploads `dist/` only after an explicitly authorized push to `main`.
