# Noosa Mini Golf Scorecard App — Design Brief

> **Purpose:** This document is a design specification for adapting the mini-golf scorecard web app AND its admin portal from the original Mermaid Beach brand to **Noosa Mini Golf**. Use it as the single source of truth when implementing UI changes. Every screen is covered with specific, actionable direction.
>
> **Adapted from:** the original Putt Putt Mermaid Beach design brief. Structure and UX logic preserved; brand identity (color, type, venue-specific copy) replaced throughout with Noosa Mini Golf's confirmed identity.
>
> **Confirmed: single course.** Noosa Mini Golf is **one 18-hole course** (not three like the original Mermaid Beach app's Fun Run/Jungle Trail/Waterways). The Course Selection screen is removed entirely — the flow goes straight from Home → Player Entry. See Screen 2 below.

---

## 1. Brand Identity & Design System

### Brand Essence
This is a **retro-coastal, beach-club style mini-golf venue** near Noosaville, Queensland. The brand personality is **relaxed, sun-bleached, and social** — think beach-club sunset, not tropical jungle, and not corporate. It's licensed (bar on-site), casual walk-up (no bookings needed), and leans into an Instagram-friendly, "Putt, Sip, Repeat" social vibe. Every screen should feel like a lazy sunny afternoon out with friends, not a form to fill in.

### Venue Business Rules (confirmed from live site — build these into the data model and copy)

Pulled from the Price, FAQ, and Group Bookings pages, current as of Aug 2026 — **worth re-confirming with the venue before launch, as prices/rules can change**:

- **One 18-hole course.** No course selection screen needed.
- **Pricing:** Adult Pass $15, Child Pass (under 18) — price not listed on-page but implied lower/free-tier, Family Pass (2 adults + 2 children) $20... **note:** the site lists "$20" directly under Family Pass heading and "$60" further down — likely $20 is a typo/layout artifact and $60 is the actual Family Pass price; **confirm actual numbers with the venue before hardcoding.**
- **Replay pricing:** A second round is **$5 per person** — this directly informs the "Play Again" flow/pricing shown on the Final Scores screen.
- **Group size cap:** Maximum **6 players per group** — the app's player entry should cap at 6, not just default to showing 2–4.
- **Bookings:** Not required for casual play; only required for groups of **20+**.
- **Round duration:** Approx. **1 hour** for 18 holes — could inform an estimated-time display or a "time remaining" nudge.
- **Age guidance:** Suitable for ages 5+; under-10s require adult supervision — worth a note on the Player Entry or Home screen.
- **Accessibility:** Course is **not** pram or wheelchair accessible due to terrain — worth a small disclaimer in the app rather than silence, so families/groups aren't caught out on arrival.
- **Licensed venue:** No BYO food/drink; kiosk and "Golf Clubhouse" on-site — reinforces the bar/kiosk upsell screen (Screen 6) as genuinely relevant, not just decorative.
- **Group/School/Corporate rates exist** (school $12/student, group 10+ $15/person, corporate packages with catering) — likely out of scope for the *player-facing* scorecard app, but relevant if the **admin portal** ever needs a bookings/rates management section.
- **Footwear rule:** enclosed flat shoes recommended, no high heels — minor, but could be a one-line reminder on a pre-game screen.

### Color Palette

Confirmed from the live site (screenshot review, Aug 2026) — see `BRAND-noosa-minigolf.md` for source detail.

| Token                | Value       | Usage                                          |
|-----------------------|-------------|------------------------------------------------|
| `--color-primary`     | `#1B4B44`  | Deep teal — headers, primary surfaces, wordmark |
| `--color-secondary`   | `#8FBBAE`  | Sage green — CTAs, buttons, highlights          |
| `--color-accent`      | `#E8A98B`  | Coral/sunset — alerts, promo elements, badges   |
| `--color-bg`          | `#F3C4A8`  | Peach/coral tint — page background (lighter tint below) |
| `--color-bg-tint`     | `#FBE8DC`  | Softer peach — use where full-strength `--color-bg` is too strong on large areas |
| `--color-header-bg`   | `#F5F0A9`  | Pale butter yellow — top nav / header band     |
| `--color-surface`     | `#FFFFFF`  | Cards and inputs                               |
| `--color-text`        | `#1B2E2B`  | Near-black teal — primary text                 |
| `--color-text-light`  | `#5A7A73`  | Muted teal — secondary/helper text              |
| `--color-success`     | `#4CAF7D`  | Hole-in-one, positive feedback                  |
| `--color-error`       | `#E74C3C`  | Error states (used sparingly)                   |

**Key rule:** No indigo, no blue-purple, no cyan, no "golf course green" (`#1B6B3A`-style deep green is the *old* Mermaid Beach identity — do not reuse it here). Teal + peach + sage + pale yellow is Noosa Mini Golf's DNA. It should read as warm and retro, not sporty.

**Contrast note:** Sage green (`--color-secondary`) on white passes for large text/buttons but check contrast carefully for small body text — pair sage backgrounds with `--color-primary` (deep teal) text, not `--color-text-light`.

#### Admin Portal Extended Palette

The admin portal needs additional tokens for data-dense UI. These extend the core palette — they don't replace it.

| Token                     | Value       | Usage                                          |
|----------------------------|-------------|------------------------------------------------|
| `--admin-bg`              | `#FAF6F1`  | Warm off-white for large screens                |
| `--admin-sidebar-bg`      | `#FFFFFF`  | Clean white sidebar                             |
| `--admin-sidebar-active`  | `#E4EFEC`  | Light teal tint for active nav item             |
| `--admin-sidebar-text`    | `#37474F`  | Dark slate — readable but not harsh             |
| `--admin-border`          | `#E8DCD2`  | Subtle warm-grey for table borders, dividers    |
| `--admin-table-header`    | `#1B4B44`  | Same primary teal — table headers               |
| `--admin-table-stripe`    | `#FAF3EC`  | Very faint peach stripe for alternating rows    |
| `--admin-stat-blue`       | `#2196F3`  | Analytics accent — advert performance stats     |
| `--admin-stat-orange`     | `#E8A98B`  | Analytics accent — warnings, skip clicks (uses brand coral, not generic orange) |
| `--admin-stat-purple`     | `#7C4DFF`  | Analytics accent — rates, percentages           |

### Typography

Noosa Mini Golf's site pairs a soft serif for headings with a clean sans for body copy — a beach-club editorial feel rather than the chunky playful look of the original brief.

| Role          | Font                        | Weight  | Size (mobile) |
|---------------|------------------------------|---------|---------------|
| Display/Hero  | **Playfair Display** (Google)| 700     | 28–36px       |
| Headings      | **Playfair Display**         | 600–700 | 20–28px       |
| Body          | **Inter** (Google)           | 400/600 | 16px          |
| Labels/Small  | **Inter**                    | 600     | 13–14px       |
| Score numbers | **Playfair Display**         | 700     | 24–32px       |

**Key rule:** No Fredoka One, no rounded "kids' fun park" display font — that reads as a different brand entirely. Playfair Display gives the elegant, retro-coastal character that matches the beach-club identity; Inter is its clean, highly legible companion.

#### Admin Portal Typography Adjustments

The admin portal uses the same font families but dials back the display flourish for data readability:

| Role               | Font                 | Weight  | Size       |
|---------------------|----------------------|---------|------------|
| Page titles         | **Playfair Display** | 700     | 24–28px    |
| Section headings    | **Inter**            | 700     | 18px       |
| Table headers       | **Inter**            | 700     | 12px, uppercase, `letter-spacing: 0.8px` |
| Table body          | **Inter**            | 400     | 14px       |
| Stat card numbers   | **Playfair Display** | 700     | 32–40px    |
| Stat card labels    | **Inter**            | 600     | 12px, uppercase |
| Sidebar nav         | **Inter**            | 600     | 15px       |
| Badge counts        | **Inter**            | 700     | 12px       |

### Border Radius & Shape Language
- Cards: `16px`
- Buttons: `50px` (fully rounded pill shape)
- Inputs: `12px`
- Score buttons: `12px`
- Everything should feel soft and relaxed — no sharp corners anywhere.

#### Admin Portal Shape Language
- Cards/panels: `12px`
- Table container: `12px` on outer wrapper, `0` on internal rows
- Buttons: `8px` (less playful, more functional)
- Sidebar nav items: `8px`
- Badges/pills: `50px`
- Stat cards: `12px`

### Shadows & Depth
Use warm-toned shadows, not grey:
```css
--shadow-card: 0 4px 16px rgba(27, 75, 68, 0.08);
--shadow-button: 0 4px 12px rgba(143, 187, 174, 0.35);
--shadow-elevated: 0 8px 32px rgba(27, 75, 68, 0.12);
```

#### Admin Portal Shadows
Lighter, subtler shadows for data-dense layouts:
```css
--admin-shadow-card: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
--admin-shadow-sidebar: 1px 0 3px rgba(0, 0, 0, 0.05);
--admin-shadow-dropdown: 0 4px 16px rgba(0, 0, 0, 0.1);
```

### Spacing Scale
Base unit: `8px`. Use multiples: 8, 16, 24, 32, 48, 64. Generous padding throughout — nothing should feel cramped. Minimum touch target: `48px`.

### Transitions
All interactive elements: `transition: all 0.2s ease`. Buttons get a subtle scale on press: `transform: scale(0.97)`.

---

## 2. Player App — Screen-by-Screen Specifications

---

### Screen 1: Home / Splash

**Redesign direction:**

- **Background:** Full-bleed photography of the course (bright, sunny, outdoor lifestyle shots — matches the venue's own photography style) or the peach/teal gradient if no photo asset is available.
- **Add the Noosa Mini Golf logo lockup** at the top — the circular sunset/palm badge + "NOOSA MINI GOLF" wordmark, matching the live site's header treatment.
- **Redesign the CTA button:**
  - Full width minus 32px side margins.
  - Sage green background (`--color-secondary`) with deep teal text (`--color-primary`) — matches the site's own "Plan Your Trip" button styling.
  - Playfair Display, 20px, uppercase or title case: **"Start Your Game"**
  - Pill shape, prominent shadow (`--shadow-button`).
  - Position in the bottom third of the screen.
  - Add a subtle gradient scrim behind it (transparent to `rgba(0,0,0,0.35)`) so it reads clearly regardless of the background art.
- **Add a subtle pulsing animation** on the CTA to draw attention (gentle scale 1.0→1.03 loop, 2s duration).
- **Tagline placement:** "Mini Golf, Major Fun" in Playfair Display below the logo, matching the site's hero copy.

---

### Screen 2: Course Selection — **removed**

Noosa Mini Golf is a single 18-hole course, so this screen is cut entirely from the flow. Tapping "Start Your Game" on Home goes straight to **Screen 3: Player Entry**.

This simplifies the original app meaningfully — no per-course theming, no course artwork cards, no course-comparison logic anywhere in the admin analytics either (see Section 3.6).

---

### Screen 3: Player Entry

**Redesign direction:**

- **Header:** `--color-primary` (deep teal) banner. Show the Noosa Mini Golf badge logo small (32×32) next to "18 holes" text. Playfair Display for any heading text, Inter for "18 holes."
- **"Who's playing?" heading:** Playfair Display, 24px, with a golf ball or palm tree emoji.
- **Group size cap: 6 players maximum** (confirmed venue rule) — the "+ Add player" control should stop and disable itself after Player 6, ideally with a small note like "Max 6 players per group — see staff for bigger groups" rather than silently doing nothing.
- **Player input rows — add personality:**
  - Each player row: `[Color dot] [Avatar emoji picker] [Name input]`.
  - **Color assignment:** with up to 6 players now supported, extend beyond 4 colors — e.g. Coral, Teal, Sage, Butter Yellow, plus two more derived tints (a deeper teal and a muted terracotta) so all 6 slots have a distinct, on-brand color. Shown as a filled circle (`20px`) to the left of the input. Carries through to scoring screen.
  - **Avatar picker:** optional polish — tappable circle, popover grid of 12–16 emojis themed to the venue (⛳ 🏝️ 🌴 🍹 🦩 🎯 🏆 ⭐ 🌊 🍦 🎉 🔥). Default: first emoji in set.
  - Input styling: `border: 2px solid #E0D2C4`, `border-radius: 12px`, `padding: 14px 16px`, Inter 16px. Focus: `border-color: var(--color-secondary)`, `box-shadow: 0 0 0 3px rgba(143,187,174,0.25)`.
  - Player 1 label: "Player 1 ★" (always required). Others: "Player 2 (optional)".
- **Show only Player 1 and 2 inputs initially.** "+ Add player" link reveals players 3 through 6, one at a time.
- **Age note:** small helper text below the heading — "Ages 5+ · under-10s must be supervised" (Inter 12px, `--color-text-light`) — matches the venue's stated FAQ policy.
- **"Start Round →" button:** sage green background, deep teal text, full width, pill shape, at the bottom. Disabled (grey) until Player 1 has a name.

---

### Screen 4: Email Capture

**Preferred: fold into Player Entry screen (Option A).**
- Add an email field at the bottom of the player entry form, below the player inputs, above "Start Round."
- Label: "Email (optional)" — Inter 14px, `--color-text-light`.
- Helper text: "We'll send your scorecard here after the round."

**Option B (separate screen, if business requires it):**
- Same deep teal header for continuity.
- Add an illustration (envelope with a scorecard, or a simple palm/sunset motif matching the logo) to fill dead space.
- "Skip" text link below the CTA.
- CTA copy: "Let's Play! →"

---

### Screen 5: Hole Scoring (the core gameplay screen)

**Redesign direction:**

- **Header:**
  - `--color-primary` (deep teal) background.
  - Progress bar: **12px tall**, rounded ends, sage green fill (`--color-secondary`) on a dark teal track.
  - "Hole 1 of 18" in Playfair Display, 22px, white. Round name above in Inter 13px, white, 60% opacity.
  - Back arrow: white, 24px, left-aligned.

- **Hole illustration card:**
  - Course diagram card — if the venue provides real hole-layout graphics (recommended, since "two hole locations per green" is a distinctive mechanic worth showing visually), make this the centerpiece.
  - Tip text ("Aim for the left cup..." etc.) styled distinctly: italic Inter, `--color-text-light`, lightbulb emoji, subtle left border in coral (`--color-accent`) as a callout.
  - **Two-hole-location note:** if a green genuinely has two cup positions, the hole card should clearly indicate which one is in play that day/round — confirm this mechanic with the venue before building, per the open question in the brand doc.

- **Score entry — THE most important redesign:**
  - **Player indicator:** current player's name prominently with their assigned color dot. E.g. "🟠 Sarah's turn" in Playfair Display, 18px.
  - **Score buttons — BIG and tactile:**
    - Grid: 5 buttons in a row, minimum **56px tall × 56px wide** (ideally 64px).
    - `border-radius: 12px`, `border: 2px solid #E0D2C4`, `background: white`.
    - Number in Playfair Display, 24px, `--color-text`.
    - **Selected state:** `background: var(--color-secondary)`, `color: var(--color-primary)`, `border-color: var(--color-secondary)`, `box-shadow: var(--shadow-button)`, `transform: scale(1.08)`.
    - Score of 1 (hole-in-one): brief sparkle animation, "Hole in one! ⭐" text.
    - Score of 5+: "+" button for 6, 7, etc.
  - Outdoor readability matters — this app is used in bright Queensland sun.

- **"Next: Hole X →" button:** full width, sage green background, deep teal text, pill shape. Disabled until all players have a score. Final hole (18): "See Final Scores →" with a trophy emoji.

---

### Screen 6: Promo/Ad Interstitial

**Redesign direction:**

- Thin app-branded header bar (48px, `--color-primary` background, "NOOSA MINI GOLF" in small pale-yellow text).
- Bottom action bar matching the design system:
  - Background: white or `--color-bg-tint`, top shadow.
  - "Skip" as text link (Inter 16px, `--color-text-light`).
  - "Book Now" / "View Menu" as pill button with accent color (`--color-accent`, deep teal text — check contrast).
  - `padding: 12px 16px`, safe-area bottom padding.
- **Given the venue is fully licensed with an on-site kiosk/beer garden**, this screen is a natural fit for bar/kiosk promo content — "Cold one waiting at the kiosk 🍹" style messaging fits the brand voice better than a generic meal-deal ad.

---

### Screen 7: Final Scores / Results

**Redesign direction — make this the celebration moment:**

- **Header:** `--color-primary` background, 180px+ height. Round name in Inter 14px, white 70% opacity. "Final Scores" in Playfair Display, 32px, white. "18 holes complete ✓" in Inter 14px, white 80% opacity.
- **Confetti animation:** 2–3 second burst on load, brand colors — teal, sage, coral, pale yellow (not the old green/gold set).
- **Winner announcement card:** `--shadow-elevated`, `border-radius: 16px`. Trophy icon (48px). "[Name] wins!" in Playfair Display, 26px, `--color-primary`. "Score: [X]" in Inter 18px, `--color-text-light`. Solo round: "[Name]'s Score" without "wins".
- **Player rankings:** `[Rank] [Color dot] [Name] ......... [Score]`. 🥇🥈🥉 for top 3. Subtle coral background tint on the winner's row (swap gold tint for coral, since coral/sunset is this brand's accent, not gold). Scores in Playfair Display, 22px, `--color-accent` for winner, `--color-text` for others.
- **Replay pricing (confirmed real venue rate):** a second round is genuinely **$5 per person** at Noosa Mini Golf — so this section can promote an *actual* offer rather than an arbitrary discount coupon. Styled "ticket" card, subtle diagonal pattern in `rgba(232,169,139,0.1)` (coral tint), tear-off notches. 🎉 "Play again for just $5!" in Playfair Display 20px, `--color-accent`. "Show this screen at the kiosk" in Inter 13px, `--color-text-light`, instead of a generic promo code — since this is a standing venue price, not a time-limited coupon, drop the "valid for 30 days" framing entirely.
- **Error states:** small dismissible toast at the bottom, not a large red banner. Auto-dismiss 5s with retry.
- **Action buttons:** "View Leaderboard" — outline/ghost, `--color-primary` border/text. "Play Again" — sage fill, deep teal text. Stack vertically, 12px gap, full width.

---

## 3. Admin Portal — Design Specifications

The admin portal is a desktop web app for venue staff to manage rounds, emails, rewards, adverts, analytics, and the leaderboard.

### 3.1 Overall Direction
Apply the same principle as the original brief: **one consistent brand system across every screen** — no cyan headers, no rainbow stat labels, no mismatched card styles. Replace every instance of the old Mermaid Beach green/gold/cyan system with the teal/peach/sage palette above.

### 3.2 Admin Sidebar
- Background: `--admin-sidebar-bg` (white), `1px` right border in `--admin-border`.
- Logo area: Noosa Mini Golf badge logo at top. "ADMIN PORTAL" in Inter 11px, `letter-spacing: 2px`, uppercase, `--color-text-light`. `24px` bottom padding, `1px` divider.
- Nav items: `44px` height, `padding: 0 16px`, `border-radius: 8px`, `margin: 2px 8px`. Inter 15px 600, `--admin-sidebar-text`. SVG icons (Lucide/Heroicons), 20px, `--color-text-light` → `--color-primary` when active.
- **Active state:** `background: var(--admin-sidebar-active)` (light teal), left `3px` border in `--color-primary`.
- **Hover state:** `background: #F2ECE4`.
- **Badge counts:** pill shape, `background: var(--color-primary)`, white text.
- **Footer:** "Noosa Mini Golf" text + logout icon/link.
- Responsive: collapse to icon-only rail at `< 1024px`.

### 3.3 Admin Page Layout
- Title: Playfair Display, 26px, `--color-text`. Optional subtitle: Inter 14px, `--color-text-light`.
- Right-aligned action buttons ("+ New Reward", "Export CSV").
- `padding: 32px 32px 24px 32px`, bottom border `1px solid var(--admin-border)`.
- Content area: `padding: 24px 32px`, `max-width: 1400px`.
- Background: `--admin-bg`.

### 3.4 Admin Tables (Rounds, Emails)
- Table wrapper: white, `border-radius: 12px`, `box-shadow: var(--admin-shadow-card)`, `overflow: hidden`.
- **Header row:** `background: var(--admin-table-header)` (`#1B4B44` — brand teal, not cyan). Inter 12px 700 uppercase white, `letter-spacing: 0.8px`.
- Body rows: alternating stripes (white / `--admin-table-stripe`), `1px solid var(--admin-border)` bottom border, Inter 14px `--color-text`. Hover: `background: #EFF5F3`.
- Action buttons: icon buttons (pencil/trash), `32px × 32px`, `border-radius: 6px`. Edit hover: `#E4EFEC` bg, `--color-primary` icon. Delete hover: `#FDECEA` bg, `--color-error` icon. **Delete always triggers confirmation dialog.**
- Filter tabs: segmented control, `border: 1px solid var(--admin-border)`, `border-radius: 8px`. Active: `background: var(--color-primary)`, white text.

### 3.5 Admin Cards (Rewards, Adverts)
- Container: `max-width: 400px`, `border-radius: 12px`, `box-shadow: var(--admin-shadow-card)`, `overflow: hidden`.
- Image area: `height: 200px`, `object-fit: cover`. No-image placeholder: subtle pattern/icon on `--admin-bg`, not blank grey.
- Status badge: `background: var(--color-success)` (active) or `#B0BEC5` (inactive), white text, pill shape.
- Content: Inter 17px 700 title, Inter 14px subtitle, Inter 13px metadata.
- Action bar: Edit (outlined, `--color-primary`), Deactivate (ghost, `--color-text-light`), Delete (ghost, `--color-error`, confirmation required).
- Grid: `repeat(auto-fill, minmax(340px, 400px))`, `gap: 24px`.

### 3.6 Analytics Dashboard
- Time filter tabs: same segmented control as 3.4.
- Stat cards — **two-color system**: game stats row in `--color-primary` (teal) labels; advert performance row in `--admin-stat-blue`. No rainbow of four+ colors.
- Card styling: white, `border-radius: 12px`, `box-shadow: var(--admin-shadow-card)`, `padding: 20px 24px`.
- Number: Playfair Display 36px. Label: Inter 12px 600 uppercase.
- Standout stats: `4px solid var(--color-secondary)` left border instead of a different label color.
- Charts: since there's only one course, drop the "Games by Course" comparison chart entirely — it has nothing to compare. Keep "Daily Games" as a single-series bar chart in `--color-primary` teal. Consider adding a "Replays" metric instead (given the $5 second-round pricing, replay rate is a genuinely useful business stat this venue would care about).
- Click-through progress bar: `--color-primary` fill on `#E4EFEC` track, pill shape, 12px height.

### 3.7 Leaderboard (Admin View)
- **Single column** (one course, not three side-by-side like the original). Header: dark teal, Playfair Display 18px white.
- Table: same styling as 3.4. Medal rows: coral/silver/bronze tints (swap gold tint for coral).
- Empty state: flag/palm illustration, "No scores yet — be first!" Inter 15px `--color-text-light`.
- Consider adding a simple date-range filter here (Today / This Week / All Time) since there's no course dimension left to segment by — time is the more useful filter for a single-course venue.

### 3.8 Leaderboard Display (Public TV/Kiosk View)
- Preserve the strong structure from the original: dark background, logo, large title, auto-refresh timer, medal emojis, bold names.
- Typography: Playfair Display for "Leaderboard" title and scores, Inter for names.
- Header colors: `--color-primary`, not a random green.
- Footer: "Refreshes automatically every 30 seconds · Noosa Mini Golf" — Inter 12px, `rgba(255,255,255,0.4)`.
- Auto-scroll for long leaderboards on wall-mounted TVs, if applicable.

---

## 4. Global Patterns

### Buttons (Player App)
| Type      | Background                  | Text Color         | Border                       |
|-----------|-------------------------------|---------------------|-------------------------------|
| Primary   | `--color-secondary` (sage)   | `--color-primary`  | none                          |
| Secondary | transparent                  | `--color-primary`  | 2px solid `--color-primary`  |
| Danger    | `--color-error`              | white              | none                          |
| Disabled  | `#DDD3C8`                    | `#9A8F82`          | none                          |

All buttons: `height: 52px`, `border-radius: 50px`, Playfair Display, `font-size: 16px`, `letter-spacing: 0.5px`. Full width on mobile. Active: `transform: scale(0.97)`.

### Buttons (Admin Portal)
| Type      | Background                  | Text Color         | Border                       |
|-----------|-------------------------------|---------------------|-------------------------------|
| Primary   | `--color-primary` (teal)     | white              | none                          |
| Secondary | transparent                  | `--color-primary`  | 1px solid `--color-primary`  |
| Danger    | transparent                  | `--color-error`    | 1px solid `--color-error`    |
| Ghost     | transparent                  | `--color-text-light` | none                        |

Admin buttons: `height: 40px`, `border-radius: 8px`, Inter 600, `font-size: 14px`. Not pill-shaped. Active: `transform: scale(0.98)`.

### Inputs (Player App)
- `height: 52px`, `border: 2px solid #E0D2C4`, `border-radius: 12px`, `padding: 0 16px`, Inter 16px.
- Focus: `border-color: var(--color-secondary)`, `box-shadow: 0 0 0 3px rgba(143,187,174,0.25)`.
- Placeholder: `color: #B0A090`.

### Inputs (Admin Portal)
- `height: 40px`, `border: 1px solid var(--admin-border)`, `border-radius: 8px`, `padding: 0 12px`, Inter 14px.
- Focus: `border-color: var(--color-primary)`, `box-shadow: 0 0 0 3px rgba(27,75,68,0.1)`.

### Cards
- `background: white`, `border-radius: 16px`, `box-shadow: var(--shadow-card)`, `padding: 20px`.

### Page Backgrounds
- Player app: `--color-bg-tint` (`#FBE8DC`) as default; `--color-header-bg` for nav bands.
- Admin portal: `--admin-bg` (`#FAF6F1`).
- Never use indigo, blue-purple, cyan, or the old flat golf-green.

### Navigation Headers (Player App)
- `background: var(--color-primary)`, minimum height `100px`.
- Back arrow: white, left-aligned. Title: Playfair Display, white, centered.
- `border-radius: 0 0 24px 24px` on the bottom edge.

### Toast / Snackbar Notifications
- Fixed bottom, 16px from edges, above bottom buttons.
- `border-radius: 12px`, `padding: 14px 20px`.
- Error: `background: #FDE8E8`, `color: #C0392B`, left border 4px `--color-error`.
- Success: `background: #E9F5EF`, `color: #1B4B44`, left border 4px `--color-success`.
- Auto-dismiss 5s, small "×" close button.

### Admin Confirmation Dialogs
- Modal overlay: `rgba(0,0,0,0.4)`, centered card, `max-width: 420px`, `border-radius: 12px`, `padding: 24px`, white.
- Title: Inter 18px 700. Body: Inter 14px 400.
- "Cancel" secondary, "Delete" danger. Right-aligned, `8px` gap.

---

## 5. Motion & Animation

- Page transitions: slide in from right (forward), left (back). 300ms ease-out.
- Card entrances: stagger from bottom with fade, 80ms delay per card, 400ms duration.
- Button press: `scale(0.97)` on `:active`, 100ms.
- Score button select: bounce (`scale(1.08)` → `1.0`), 200ms.
- Confetti (final scores): 2–3s burst. Teal, sage, coral, pale yellow particles.
- Progress bar: animate width on hole change, 500ms ease.
- Admin portal: minimal animation — fade-in only (`opacity 0→1`, 200ms), hover `transition: all 0.15s`. No bounces, no stagger.

---

## 6. Accessibility & Practical Notes

- Minimum touch targets: 48×48px (player app), 32×32px (admin portal).
- Contrast: WCAG AA (4.5:1 body, 3:1 large). **Check sage-on-white and coral-on-white combinations specifically** — verify against actual rendered colors before shipping, as this brief's hex values are confirmed-by-screenshot estimates, not pixel-picked from source files.
- Safe areas: `padding-bottom: env(safe-area-inset-bottom)` on bottom-fixed elements.
- Outdoor readability: high contrast, avoid light tones on light backgrounds — this app is used in bright Queensland sun.
- Font loading: Playfair Display (700) and Inter (400, 600, 700) from Google Fonts. `font-display: swap`.
- Admin responsive: sidebar collapses to icon-only rail at `< 1024px`. Tables get horizontal scroll at `< 768px`.

---

## 7. Implementation Priority

### Player App (in order of impact):
1. **Color palette swap** — Replace all green/gold with teal/peach/sage/coral palette.
2. **Typography** — Load Playfair Display + Inter, apply everywhere (remove Fredoka One/Nunito).
3. **Remove course selection screen** — Home → Player Entry directly; strip any multi-course data model assumptions.
4. **Player cap: 6, not 4** — extend player slots/colors and Add Player logic to support the confirmed group size.
5. **Score buttons** — 2–3× larger with clear selected states.
6. **Final scores celebration** — Confetti (new palette), real $5-replay messaging, rankings.
7. **Player entry personality** — Color dots (6 distinct on-brand tints), progressive disclosure.
8. **Motion & animation** — Page transitions, card entrances, button feedback.
9. **Email screen consolidation** — Merge into player entry.

### Admin Portal (in order of impact):
1. **Table header color swap** — Cyan → `--color-primary` teal.
2. **Sidebar redesign** — Active states, SVG icons, teal badges, Noosa Mini Golf logo.
3. **Typography** — Playfair Display for titles/stat numbers, Inter everywhere else.
4. **Remove course-comparison charts/columns** — single course means no "by course" breakdowns anywhere.
5. **Stat card color unification** — Two-color system, not rainbow; consider adding a replay-rate stat.
6. **Table row styling** — Alternating stripes, hover states, icon actions.
7. **Card redesign (Rewards/Adverts)** — Consistent padding, image placeholders.
8. **Confirmation dialogs** — All destructive actions.

---

## 8. Assets Needed

- **Playfair Display** — `https://fonts.google.com/specimen/Playfair+Display`
- **Inter** — `https://fonts.google.com/specimen/Inter`
- **canvas-confetti** (optional) — `npm install canvas-confetti` or CDN
- **Lucide Icons** (admin portal) — `npm install lucide-react` or CDN
- **Noosa Mini Golf logo assets** — circular sunset/palm badge + wordmark, pulled from the live site
- **Course hole diagrams/photography** — request directly from venue if not already provided; needed to properly represent the "two hole locations per green" mechanic
- **Empty state illustrations** — palm tree or flag-on-green SVGs for empty tables/leaderboards

---

## Open Questions Before Build

1. ~~Single course vs. multi-course~~ — **resolved: single 18-hole course.**
2. Does "two hole locations per green" need explicit handling in the scoring data model (e.g. selecting which cup is active that day)?
3. Confirm exact brand hex codes against the venue's actual logo file or brand guide — this brief's colors are screenshot-confirmed, not source-file-confirmed.
4. Clarify the relationship to Noosa Hills Par 3 Golf Course for admin/reporting purposes — one combined backend, or fully separate?
5. **Pricing page has a likely display bug/ambiguity:** Family Pass shows both "$20" and "$60" near each other — confirm actual current prices directly with the venue before hardcoding any prices into the app (e.g. into the replay/upsell screen).
6. Should the admin portal include the school/group/corporate booking rates at all, or is that strictly out of scope for a player-facing scorecard app?
