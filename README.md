# C-17 Revision

A revision app for C-17A aircraft systems and wider flying knowledge. It runs entirely
in the browser, installs to an iPhone home screen, and works with no signal once opened
once.

## What's in it

| Section | Contents |
|---|---|
| Aircraft systems | 11 systems, 183 questions — hydraulics, engines, engine operation, fuel, ancillary & emergency equipment, mission computer, performance, cold/adverse/hot weather ops, ops manual |
| Limitations | 85 figures across 8 groups |
| Docs check | 32-item folder and logbook check |
| IR(E)T syllabus | 7 parts, 191 objectives |
| IR(E)T questions | 133 sample questions, each cross-referenced to the paragraph that answers it |
| PBN, RNAV & RNP | 32 items at ATPL/IR(E)T depth |
| Communications theory | 8 items — frequencies, propagation, failure, light signals |
| CAP 413 | The Radiotelephony Manual, Edition 24 — 11 chapters, 707 paragraphs, 574 phraseology exchanges |
| NAT Doc 007 | North Atlantic Operations and Airspace Manual, V.2026-1 — 13 chapters, 522 paragraphs |
| ATPL theory | 23 items across law, nav, radio nav, principles of flight, performance, human factors |
| Quiz | 166 multiple-choice questions, weighted to what you haven't got right |

Everything is searchable from one box. Progress is saved per device and can be moved
with a backup code from the Progress tab.

## Hosting it

iOS only gives a web app an icon, working JavaScript and saved progress if it is served
over HTTPS, so it has to live on a host somewhere. Two routes, depending on whether you
keep `cap413.js`.

### Recommended for personal use — Cloudflare Pages behind a login

Keeps CAP 413 in, and keeps the site off the open internet. Free.

1. Push the files to a GitHub repository (or upload them directly to Cloudflare).
2. At **dash.cloudflare.com** → **Workers & Pages** → **Create** → **Pages** →
   connect the repository. Build command: leave blank. Output directory: `/`.
3. Once deployed, go to **Zero Trust** → **Access** → **Applications** →
   **Add an application** → **Self-hosted**. Point it at your `*.pages.dev` domain.
4. Add a policy: action **Allow**, rule **Emails** → your own email address.

Now the URL asks for a one-time code sent to your address before it will open anything.
Sign in once in Safari and the session persists, so day to day it behaves like any other
app on the phone.

### Simpler, but public — GitHub Pages

Only if you have **deleted `cap413.js`** first. See the licence note below.

1. Create a repository on github.com — call it `c17-revision`.
2. Upload every file to the root (**Add file → Upload files**, drag them in, **Commit**).
3. **Settings → Pages**. Source **Deploy from a branch**, branch **main**,
   folder **/ (root)**. Save.
4. The URL appears at the top of that page after a minute or two, and looks like
   `https://<your-username>.github.io/c17-revision/`.

## Installing it on the iPhone

1. Open that URL in **Safari** (it must be Safari — Chrome on iOS can't install web apps).
2. Tap the **Share** icon, then **Add to Home Screen**.
3. You get a C-17 icon. It opens full screen with no browser chrome.

Open it once with a signal so it can cache itself. After that it works offline —
in the air, in a crew room, anywhere.

## Updating it

Replace the changed file in the repository and commit. The app refreshes itself the
next time it's opened with a signal. If you change the content, bump `VERSION` in
`sw.js` to force every device to re-cache immediately.

## Files

```
index.html             app shell
styles.css             all styling
data.js                ground cat + IR(E)T content
extra.js               PBN, communications and ATPL content
cap413.js              CAP 413 Radiotelephony Manual  (see licence note)
nat007.js              NAT Doc 007 North Atlantic manual
app.js                 application logic
sw.js                  service worker (offline caching)
manifest.webmanifest   PWA manifest
icon-*.png             home screen icons
```

## Licence note — read before publishing

**CAP 413 must not go on a public URL.** The CAA notice in the manual reads: *"Copies of
this publication may be reproduced for personal use, or for use within a company or
organisation, but may not otherwise be reproduced for publication."* A GitHub Pages site
is public, so publishing `cap413.js` there would need formal CAA agreement.

The test is publication, not readership — a public URL counts even if you are the only
person who ever opens it. So:

- **Access-controlled host** (the Cloudflare route above) — keep `cap413.js`. This is
  personal use, which the notice expressly permits.
- **Public URL** — **delete `cap413.js` before you commit.** The app checks whether the
  file is there; if it isn't, the CAP 413 section simply doesn't appear and nothing else
  changes.

NAT Doc 007 is fine either way: ICAO states *"There is no objection to the reproduction of
extracts of information contained in this Document if the source is acknowledged."* The
source is acknowledged in the app and in `nat007.js`.

## Sources and health warning

- 99 Sqn Ground Cat Syllabus, Apr 2021 — **marked uncontrolled**
- C-17A IR(E)T Study Guide, XXIV Sqn Globemaster Flt, Jul 26 — **marked uncontrolled**
- CAP 413 Radiotelephony Manual, Edition 24, effective 1 July 2026 — UK Civil Aviation Authority
- NAT Doc 007, V.2026-1, applicable 19 March 2026 — ICAO EUR/NAT Office on behalf of the NAT SPG

The two squadron documents are marked uncontrolled. Check anything numerical against
current publications before relying on it.

Items flagged in amber are written by Claude rather than taken from a source document,
and say so. The PBN, communications and ATPL sections are revision material written from
general knowledge, not extracts from an official publication. The CAP 413 and NAT Doc 007
sections are the real documents, parsed from the PDFs.
