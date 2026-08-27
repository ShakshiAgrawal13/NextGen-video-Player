# NextGen Video Player

A production-ready, custom-built React video player with **ImageKit Adaptive
Bitrate Streaming (ABS)**, chapter navigation, multi-language subtitles,
playback-speed controls, Picture-in-Picture, fullscreen, and full keyboard
accessibility — styled with a cinema-inspired, Netflix/YouTube-grade UI.

Runs out of the box against ImageKit's public HLS demo stream, so you can
`npm install && npm run dev` with zero configuration and see everything
working immediately.

---

## 1. Features

| Category | What's included |
|---|---|
| **Playback** | Play/Pause, ±10s skip, click-to-toggle, center play glyph, auto-hiding controls |
| **Adaptive Bitrate Streaming** | ImageKit ABS master playlist consumed via `hls.js`; automatic quality switching based on measured bandwidth; native HLS fallback on Safari/iOS |
| **Quality Selection** | Auto (shows the currently-active rendition), plus manual 1080p/720p/480p/360p — built dynamically from whatever renditions ImageKit's ladder actually produced |
| **Playback Speed** | 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x |
| **Chapters** | Clickable sidebar list + tick marks on the scrubber; active chapter highlighted and shown in the title bar |
| **Subtitles** | WebVTT, multiple languages (English/Spanish/French sample tracks included), on/off toggle, styled cues |
| **Volume** | Slider + mute toggle, hover-to-reveal on desktop |
| **Fullscreen & PiP** | Native Fullscreen API and Picture-in-Picture API |
| **UI/UX** | Buffering spinner, buffered-range indicator, hover animations, auto-hiding control bar, mobile-friendly touch targets |
| **Accessibility** | Full keyboard shortcuts, ARIA roles/labels on every control, `prefers-reduced-motion` respected |
| **Performance** | `React.memo` on every leaf component, `requestAnimationFrame`-driven progress (no re-render storms from `timeupdate`), code splits cleanly via Vite |

### Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `←` | Rewind 10s |
| `→` | Forward 10s |
| `F` | Toggle fullscreen |
| `M` | Toggle mute |

---

## 2. Project structure

```
nextgen-video-player/
│
├── public/
│   ├── subtitles/
│   │   ├── en.vtt
│   │   ├── es.vtt
│   │   └── fr.vtt
│   └── sample-video/
│       └── README.md          # notes on using a local fallback file
│
├── src/
│   ├── components/
│   │   ├── VideoPlayer.jsx    # top-level player shell (forwardRef)
│   │   ├── Controls.jsx       # scrubber + control bar
│   │   ├── QualitySelector.jsx
│   │   ├── SubtitleMenu.jsx
│   │   ├── ChapterList.jsx
│   │   └── Loader.jsx
│   │
│   ├── hooks/
│   │   ├── useHls.js              # ImageKit ABS <-> hls.js integration
│   │   ├── useVideoPlayer.js      # core playback state machine
│   │   ├── useFullscreen.js
│   │   └── useKeyboardShortcuts.js
│   │
│   ├── utils/
│   │   ├── imagekit.js         # ABS master-playlist URL builder
│   │   ├── chapters.js         # chapter config + active-chapter lookup
│   │   └── formatTime.js
│   │
│   ├── styles/
│   │   ├── index.css           # design tokens + layout shell
│   │   ├── VideoPlayer.css
│   │   ├── Controls.css
│   │   ├── ChapterList.css
│   │   ├── SubtitleMenu.css
│   │   ├── QualitySelector.css
│   │   └── Loader.css
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── index.html
├── vite.config.js
├── package.json
├── .env.example
└── README.md
```

---

## 3. Getting started

```bash
npm install
npm run dev       # http://localhost:5173
```

That's it — the demo runs against ImageKit's public sample HLS stream
(`DEMO_HLS_FALLBACK` in `src/utils/imagekit.js`), so there's nothing else to
configure to see the full feature set.

### Other scripts

```bash
npm run build      # production build to dist/
npm run preview    # serve the production build locally
npm run lint       # eslint over src/
```

---

## 4. ImageKit Adaptive Bitrate Streaming (ABS) integration

### 4.1 How it works

ImageKit can take any video already uploaded to your media library and
transcode it into an **HLS rendition ladder** on the fly, simply by
requesting a special URL — no separate encoding pipeline to run yourself:

```
https://ik.imagekit.io/<your_imagekit_id>/<path-to-video>/ik-master.m3u8?tr=sr-240_360_480_720_1080
```

- `ik-master.m3u8` — tells ImageKit to return an HLS **master playlist**
  instead of the raw file.
- `tr=sr-240_360_480_720_1080` — the "stream renditions" transformation:
  a list of heights ImageKit should generate. Omit it to let ImageKit pick
  a sensible default ladder.

That single master-playlist URL is the *only* thing the player needs. From
there, standard HLS machinery (either `hls.js` or a browser's native HLS
support) handles:

- Downloading the master playlist and discovering each rendition.
- Continuously measuring throughput and switching renditions to match.
- Segment-level buffering so switches are seamless (no black frames/restarts).

### 4.2 Where this lives in the code

**`src/utils/imagekit.js`** builds the URL:

```js
export function getAbsMasterPlaylistUrl(videoPath, renditions = [1080, 720, 480, 360]) {
  const ladder = renditions.join("_");
  return `${URL_ENDPOINT}${videoPath}/ik-master.m3u8?tr=sr-${ladder}`;
}
```

**`src/hooks/useHls.js`** consumes it:

- Detects native HLS support (Safari/iOS) and hands the URL straight to
  the `<video>` tag when available — no extra JS parsing needed there.
- Otherwise instantiates `hls.js`, which does the manifest parsing, ABR
  logic, and segment buffering in a Web Worker (`enableWorker: true`) to
  keep the main thread free for UI work.
- Listens for `MANIFEST_PARSED` to populate the list of available
  qualities (feeds `<QualitySelector />`) and `LEVEL_SWITCHED` to know
  which rendition is *actually* playing right now (shown next to "Auto").
- Handles `Hls.Events.ERROR` with the documented recovery pattern:
  `startLoad()` for network errors, `recoverMediaError()` for media
  errors, and a hard failure message otherwise.

### 4.3 Configuring your own video

1. Upload a video to your ImageKit media library (via dashboard, API, or
   the Upload widget).
2. Copy your **URL endpoint** (Dashboard → Developer options), e.g.
   `https://ik.imagekit.io/your_imagekit_id`.
3. Copy `.env.example` to `.env` and fill in:
   ```
   VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
   VITE_IMAGEKIT_VIDEO_PATH=/samples/nextgen-demo.mp4
   ```
4. Restart `npm run dev`. `App.jsx` automatically switches from the demo
   fallback stream to `getAbsMasterPlaylistUrl()` once
   `VITE_IMAGEKIT_URL_ENDPOINT` is set.

### 4.4 Manual quality override

Selecting a fixed quality in the UI doesn't request a different URL — it
locks `hls.currentLevel` to the matching level index from the already-loaded
manifest. Selecting "Auto" sets it back to `-1`, returning control to
hls.js's bandwidth-based ABR algorithm. This is why quality switches are
instantaneous with no re-buffering: every rendition is already known from
the one master playlist fetch.

---

## 5. Chapter configuration

Chapters are a plain array — add your own in `src/utils/chapters.js` or
pass a custom array as the `chapters` prop on `<VideoPlayer />`:

```js
export const DEMO_CHAPTERS = [
  { id: "ch1", title: "Opening Scene", time: 0 },
  { id: "ch2", title: "Introduction", time: 18 },
  { id: "ch3", title: "Rising Action", time: 55 },
  // time is the chapter's start offset in seconds
];
```

`findActiveChapter()` determines which chapter "owns" the current
playhead position, which drives both the sidebar highlight and the
title-bar chapter pill. The scrubber also renders a small tick mark at
each chapter's position (see `.scrubber__chapter-tick` in `Controls.css`).

---

## 6. Subtitle configuration

Subtitle tracks are passed as a `subtitleTracks` prop:

```jsx
const SUBTITLE_TRACKS = [
  { id: "sub-en", label: "English", srclang: "en", src: "/subtitles/en.vtt", default: true },
  { id: "sub-es", label: "Español", srclang: "es", src: "/subtitles/es.vtt" },
  { id: "sub-fr", label: "Français", srclang: "fr", src: "/subtitles/fr.vtt" },
];

<VideoPlayer src={videoSrc} subtitleTracks={SUBTITLE_TRACKS} chapters={chapters} />
```

Each entry renders a native `<track kind="subtitles">` element. The
`<SubtitleMenu />` component doesn't re-implement caption rendering — it
simply flips each track's `mode` between `"showing"` and `"disabled"`,
letting the browser's own (accessible, screen-reader-friendly) caption
renderer do the work. Cue styling is themed via the `::cue` pseudo-element
in `VideoPlayer.css`.

Sample `.vtt` files for English, Spanish, and French ship in
`public/subtitles/`. Add more languages by dropping a new `.vtt` file
there and adding an entry to the track list.

---

## 7. Architecture explanation

The player is deliberately split into three layers:

1. **Hooks (state + side effects)** — `useHls`, `useVideoPlayer`,
   `useFullscreen`, `useKeyboardShortcuts` each own one concern and talk
   to the `<video>` element imperatively via a shared `videoRef`. This
   keeps all the messy browser-API surface (HLS manifests, media events,
   Fullscreen API, PiP API) out of the component tree entirely.
2. **`VideoPlayer` (orchestrator)** — composes the hooks, owns the
   `videoRef`/`containerRef`, and exposes a minimal imperative API via
   `useImperativeHandle` (`{ seekTo }`) so sibling UI outside the player
   (like the sidebar chapter list in `App.jsx`) can control playback
   without ever touching the DOM directly or prop-drilling the whole
   player state tree.
3. **Presentational components** (`Controls`, `QualitySelector`,
   `SubtitleMenu`, `ChapterList`, `Loader`) — pure, `React.memo`-wrapped,
   and receive everything they need as props/callbacks. None of them read
   from the DOM or hold hidden state that the parent doesn't know about.

This separation is what makes the quality/subtitle/chapter features
"just work" together: they all derive from the same two hooks
(`useHls` for ABR state, `useVideoPlayer` for playback state) rather than
each maintaining a competing source of truth.

### Data flow for a quality switch

```
User clicks "720p" in QualitySelector
  → onSelect(levelIndex) prop
  → hls.setLevel(levelIndex)      (useHls.js)
  → hlsRef.current.currentLevel = levelIndex
  → hls.js swaps segment requests to the 720p rendition
  → Hls.Events.LEVEL_SWITCHED fires
  → setActiveLevel(data.level)     (React state update)
  → QualitySelector re-renders showing "720p" as selected
```

---

## 8. Performance optimization notes

- **`requestAnimationFrame` for progress**, not `timeupdate` alone — the
  native `timeupdate` event fires inconsistently (as infrequently as 4x/sec
  in some browsers), which made the old scrubber feel choppy. Driving the
  scrubber position from an rAF loop reading `video.currentTime` directly
  gives smooth 60fps motion without over-subscribing to DOM events.
- **`React.memo` on every leaf component** (`Controls`, `QualitySelector`,
  `SubtitleMenu`, `ChapterList`, `Loader`) so a `currentTime` tick doesn't
  re-render the chapter list or subtitle menu — only the scrubber/time
  display actually needs that value every frame.
- **hls.js runs its demuxer/ABR loop in a Web Worker** (`enableWorker: true`),
  keeping segment parsing off the main thread so UI interactions (opening
  a menu, dragging the scrubber) stay responsive even during a quality
  switch or on lower-end devices.
- **Buffer tuning** (`maxBufferLength: 30`, `maxMaxBufferLength: 60`,
  `backBufferLength: 90`) balances a large-enough forward buffer to ride
  out network hiccups against not holding excessive memory for content
  already watched.
- **Single manifest fetch, N renditions** — because ImageKit ABS serves one
  master playlist describing every rendition, switching quality never
  re-requests a different URL or re-negotiates a connection; it's a
  local `currentLevel` assignment against already-parsed data.
- **Lazy work only when visible** — the loading spinner and buffering
  overlays are conditionally rendered (not just CSS-hidden), so they add
  zero DOM/paint cost when not needed.
- **Native fallback path** — on Safari/iOS, `hls.js` is skipped entirely
  in favor of the platform's own (hardware-accelerated) HLS decoder,
  avoiding unnecessary JS overhead where the browser already does this
  natively.
- **Cross-browser compatibility** — feature-detection (`canPlayType`,
  `document.pictureInPictureEnabled`, `Hls.isSupported()`) gates every
  browser-specific API, so the player degrades gracefully instead of
  throwing on browsers/environments missing a given capability.

---

## 9. Deployment guide

The app is a static Vite build — it can be deployed to any static host.

### Build

```bash
npm run build
```

Output lands in `dist/`.

### Vercel

```bash
npm i -g vercel
vercel --prod
```
Vercel auto-detects the Vite build command/output directory. Add your
`VITE_IMAGEKIT_URL_ENDPOINT` / `VITE_IMAGEKIT_VIDEO_PATH` env vars in the
Vercel project settings.

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Add the same two env vars under **Site settings → Environment variables**.

### Static hosting (S3 + CloudFront, GitHub Pages, etc.)

Upload the contents of `dist/` as-is. Since this is a single-page app with
no client-side routing in this demo, no special rewrite rules are needed;
if you add routing later, configure a fallback to `index.html` for unknown
paths.

### CORS note

ImageKit serves videos and playlists with permissive CORS headers by
default, so no extra configuration is typically required to stream from a
different origin than where the app itself is hosted. If you front
ImageKit with a custom CNAME or CDN, verify `Access-Control-Allow-Origin`
is present on both the `.m3u8` and `.ts`/`.m4s` segment responses.

---

## 10. Tech stack

- React 18 (hooks, `forwardRef`/`useImperativeHandle`, `React.memo`)
- Vite 5
- `hls.js` for ABR playback (with native HLS fallback)
- HTML5 Video API, Fullscreen API, Picture-in-Picture API
- Plain CSS3 (custom properties for theming, no framework dependency)
- ImageKit Adaptive Bitrate Streaming

---
