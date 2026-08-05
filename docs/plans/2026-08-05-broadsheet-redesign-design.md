# Broadsheet redesign — design record

**Date:** 5 August 2026
**Scope:** the public site. The portal and admin inherit the palette only.

---

## Why

The old palette was navy and crimson. Both were invented, and neither had
anything to do with the school. Meanwhile the crest sat in the header carrying
royal blue and teal, and the motto printed on it — *My utmost for His highest* —
appeared nowhere on the site at all.

The Board publishes a magazine. The site did not look like it was made by people
who publish anything.

## The direction

Set the public site like a publication. Rules, ink and whitespace do the
structural work; cards and shadows are gone. The palette comes from the crest
rather than from a colour picker.

### A caution worth recording

Broadsheet layouts with hairline rules and zero radius are one of the shapes
generated design reliably falls into. It was chosen deliberately here — the
Board genuinely is a publisher — but the direction alone does not make the site
distinctive. What does is that every specific decision is drawn from this
school: its crest, its colours, its motto, its arch.

---

## Foundations

### Colour

Sampled from `public/logo.png` rather than estimated. The crest yields black,
royal blue `#1000D0`, and teal `#30B0C0`. The blue and teal are correct on a
badge and unreadable as text, so each is deepened only as far as contrast
requires.

| Token | Light | Role |
| --- | --- | --- |
| `--ink` | `#14161C` | text, rules, masthead |
| `--paper` | `#FBFAF7` | warm newsprint, not white |
| `--brand` | `#1C2EB8` | crest blue — links, marks |
| `--accent` | `#1F8A98` | crest teal, used sparingly |
| `--line` | `#E4E1DA` | hairlines |

Dark mode is a night edition, not an inversion: the paper darkens, the ink stays
warm, and the blue lifts to `#8CA0FF` so it still reads.

### Type

Split by purpose, not by hierarchy.

- **Newsreader** (`--font-display`) for what you *notice*: mastheads, headlines,
  standfirsts, drop caps.
- **Georgia** (`--font-text`) for what you *read*: article bodies, announcements.
- **System sans** for what you *operate*: nav, buttons, forms, tables, admin.

Newsreader is loaded at one weight, display-only: **48KB**. The variable file
with its optical-size axis measured 248KB — five times the cost for range this
design never uses, on the connections least able to afford it. Body copy needs
no download at all and renders instantly.

---

## Furniture

- **Masthead** — crest, wordmark, school name, and a double rule. The double
  rule is the clearest newspaper signal available and costs nothing.
- **Dateline** — issue label, date, and the Board's full name in a ruled strip.
  Real information, not decoration.
- **Section markers** — a small-caps label with a hairline running to the edge,
  replacing card headers everywhere.
- **Measure** — long-form text is capped near 68 characters regardless of screen
  width.
- **Drop caps** — the lead item and articles only.
- **The motto** — set as a rule-break in the footer.

### The signature: the arch

The crest contains a white arch, the school gate. It frames the current issue on
the front page and in the archive, and it is **the only curve on the public
site** — which is what lets it read as a shape rather than as styling.

---

## Page decisions

**Front page.** Leads on the newest story: kicker, large headline, standfirst,
ruled byline. Secondary stories run beneath in two columns. The current issue
sits in the right rail inside the arch. The Board decides what leads by
publishing, not by configuring anything.

**Article.** Kicker, headline, standfirst, byline between rules, drop cap,
capped measure. Pull quotes available where an editor wants one.

**Archive.** Not a grid of covers — that is a shop. The current issue shown
properly, then every back issue as a ruled row: issue label, title, date. It
stays readable at fifty issues, where a grid becomes wallpaper. The lead only
appears unfiltered on page one; inside a search result "the current issue" would
be a lie.

**Empty states.** The site currently has no published content, so the front page
must hold up with nothing in it. It states what the Board is and offers a way
in, and deliberately does not link to an empty archive.

---

## What was left alone

The portal and admin keep their cards and soft corners. They are tools, used
daily, and reading furniture would slow them down. They inherit the palette and
the serif-for-reading rule; nothing else.

The PDF reader is unchanged. It works, and styling would not improve it.

---

## Glass

The chrome that floats above the page — masthead, mobile menu, portal and admin
rails — is frosted glass. The page itself stays flat ink on paper.

That split is the point rather than a compromise. A newspaper has no interface,
so the interface being glass and the content being paper draws a real line
between the two.

Three limits, each deliberate:

- **Chrome only.** `backdrop-filter` makes the compositor re-blur whatever sits
  behind it every frame. One fixed element is cheap; twenty scrolling cards is
  visible jank on the mid-range Android most of this audience carries.
- **Tint before blur.** The background is opaque enough (~72%) to hold contrast
  on its own, so text stays readable over a dark photograph. Blur is the finish,
  not the legibility.
- **Both escape hatches.** A solid fallback where `backdrop-filter` is
  unsupported, and no transparency at all for readers whose system asks for
  less.

### Two collisions this caused

Worth recording, because both were silent:

- `.glass` set `position: relative` so a pseudo-element could draw the specular
  edge. That beat the `sticky` utility on the masthead and the header stopped
  sticking. The edge is now drawn with inset shadows, which need no positioning
  context and compose with anything.
- `.glass` and `.masthead-rule` both set `box-shadow`, so adding glass wiped out
  the double rule under the masthead. The rule is now a real `3px double`
  border — a different property, so the two cannot fight.

A finish should never be able to break layout.

## Mobile

Most visitors arrive on a phone, so the layout is designed for one and scaled
up rather than the reverse.

Four things were genuinely broken at 384px before this was tested:

- **The school name was hidden.** `hidden sm:block` meant a phone showed only
  "EIC", which on its own says nothing. The school is the context that makes
  the initials mean anything, so it now shows at every width.
- **The lead cover filled an entire screen.** A 3:4 cover at full bleed is a
  wall of image before any words. Capped to 190px on phones.
- **Archive rows collapsed.** A fixed 144px label column squeezed titles into
  three-line wraps. Rows now stack on a phone — label and date share a line,
  the title gets its own — and return to a single row from 640px up.
- **Type was set for a desktop.** Body copy, standfirsts, drop caps and the
  lead headline all now start smaller and scale up at `sm`.

Tap targets were audited rather than assumed: the menu button and unread badge
were 36px and 24px, and event titles were 18px tall. All are now at least 40px.

No horizontal overflow on any surface, public or portal.

## Verified

Built and inspected in a browser, populated and empty, in both light and dark:
front page, article, archive, and every public route returning 200 with no
runtime errors. Font payload measured rather than assumed.
