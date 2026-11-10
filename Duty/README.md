# Crew Duty Planner

A crew duty time and crew rest planner for the C-17, built from 2 Gp Ops Manual Part A,
7.1.8. Runs entirely in the browser, installs to an iPhone home screen, and works with no
signal once it has been opened once.

**It is a planning aid, not the authority.** Every figure cites the paragraph it came from
so you can check it in seconds. Check against the order before you rely on it.

## What it works out

Per day, from the sectors you enter:

| | |
|---|---|
| **Duty day** | The CDT limit from the C-17 row of 7.1.8.1, chosen by local report time at the departure airfield and the sector count |
| **Duty ends** | Report plus the limit |
| **Last landing** | Duty end less 0:30 (7.1.8.4) |
| **Flex left** | What remains before the limit, and what each level of authority would buy |

It also gives you actual CDT against the limit, airborne time and great-circle distance
per sector, night sectors, the CRP required before the next duty, and cumulative CDT over
a rolling 72 hours.

## What it flags

The day card goes **green** when it is clean, **amber** when something is worth knowing,
and **red** when a limit is breached — always with the reason and the paragraph.

- CDT over the limit, naming who can authorise it: AS cdr to 1:00 (7.1.8.5.1), Sqn cdr to
  2:00 (7.1.8.5.2), DDH to 3:00 (7.1.8.5.3), ODH beyond that (7.1.8.5.4)
- CDT beyond the 18:00 split-duty ceiling (7.1.8.8)
- CRP between duties below the minimum, and by how much
- CDT cut by 2:00 where the preceding CRP fell between 18 and 30 hours (7.1.8.1 fn3)
- Five or more sectors moving you to the shorter column
- Less than an hour of margin left
- More than 40:00 CDT in a rolling 72 hours (7.1.8.3.3)
- A task running beyond 144 hours (7.1.8.3.6)
- Split-duty credit where ground time earns it (7.1.8.8)

## The limits it uses

C-17 row of 7.1.8.1, by local reporting time at the first departure:

| Report (local) | 1–4 sectors | 5 or more |
|---|---|---|
| 0500–1459 | 16:00 | 14:00 |
| 1500–0459 | 14:00 | 12:00 |

Standby, 12 hours or less to departure:

| Report (local) | 1–4 sectors | 5 or more |
|---|---|---|
| 0800–1459 | 14:00 | 12:00 |
| 1500–0759 | 12:00 | 10:00 |

Minimum CRP 12:00, plus an hour for each 4-hour time-zone change and an hour for each
hour or part that CDT exceeds the limit (7.1.8.3). Over 24:00 CDT becomes 30:00 free of
primary duties with the next duty no earlier than 0600 local. Crew in is 2:00 before ETD,
2:30 for USA or Theatre (7.1.8.1 fn4), or 5:00 where the ALM is operating (7.1.8.4).

## Deliberately not automated

These need judgement or history the app does not hold, and a wrong answer would be worse
than no answer:

- Positioning and deadheading (7.1.8.9, 7.1.8.13)
- Delayed departures before and after reporting time (7.1.8.15.2)
- Acclimatisation history (7.1.8.2) — there is a tick-box for the near-accommodation case,
  but the app cannot know your last three nights
- Enduring operational deployments (7.1.8.3.1)
- Napping guidance (7.1.8.14)

## Deploying it

Easiest is a `duty` folder inside the repo you already have, so you get a second
installable app without a second repository.

1. In your `c17-revision` repo, **Add file → Create new file**, type `duty/README.md`,
   paste anything, commit. That creates the folder.
2. **Add file → Upload files**, open the `duty` folder first, then drag in every file from
   this package.
3. It appears at `https://<your-username>.github.io/c17-revision/duty/`.

Or create a repository of its own and turn on Pages exactly as you did before.

### On the iPhone

Open the URL in **Safari**, tap **Share**, then **Add to Home Screen**. You get a separate
clock icon alongside the revision app. Open it once with a signal so it can cache itself.

## The map

Routes are drawn as true great circles on a projection written into the page, so the plot
always works, signal or not. Map imagery sits underneath it when it can be fetched, and
the **MAP / PLOT** button switches between them. The note under the button tells you which
you are getting.

Imagery comes from CARTO's basemaps over OpenStreetMap data and is attributed on the map
whenever it is showing. Tiles you have already viewed are cached, so a route you planned at
a desk still has imagery later without a connection. It will **not** load inside a Claude
artifact — that sandbox blocks third-party images — but will on your own site.

## Station data

`stations.js` holds about 70 airfields with coordinates and UTC offsets. **These were
written from memory and are approximate.** They are accurate enough to draw a route and
to pick the right CDT band, but should be replaced with a source you trust before anyone
leans on the distances. The file is plain and easy to edit or swap wholesale.

Offsets are fixed, so stations observing summer time will be an hour out for part of the
year. That matters because the CDT band turns on local reporting time — check any case
sitting near 0500 or 1500 local.

## Files

```
index.html             the whole app
stations.js            airfield coordinates and UTC offsets
sw.js                  service worker (offline, tile cache)
manifest.webmanifest   PWA manifest
icon-*.png             home screen icons
```
