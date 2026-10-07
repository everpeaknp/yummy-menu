# Hyperframes Composition Brief: Yummy Menu — One Complete Restaurant Visit

## Objective
Create a polished 25-second landscape product film that tells one causal restaurant visit from table QR through order, bill request, and saved customer relationship.

## Output
- Composition directory: `brag-output-2026-10-06-003417/composition/`
- Rendered video: `brag-output-2026-10-06-003417/brag.mp4`
- Format: landscape — 1920x1080, 30 fps
- Duration: exactly 25.00 seconds

## Source Material
- Project root: `C:\Users\PREDATOR\OneDrive\Desktop\yummy-menu`
- Primary files read: `src/app/layout.tsx`, `src/app/globals.css`, `RestaurantExperienceHome.tsx`, `MenuGrid.tsx`, `CategoryNav.tsx`, `MenuItemCard.tsx`, `ItemCustomizationDrawer.tsx`, `FloatingCart.tsx`, `TableServiceActions.tsx`, `CustomerProfile.tsx`, `TableQrScanner.tsx`
- Product name: Yummy Menu
- Tagline / strongest claim: `Dine, earn, return`
- Key UI or visual moment to recreate: the real mobile customer flow from verified table to menu, customization, cart/order, table service, and profile
- Copy that must appear verbatim where supplied by the product:
  - `Everything for your visit, in one place.`
  - `Find your next favourite.`
  - `Search the menu…`
  - `Sending Request`
  - `Place Order`
  - `Need something?`
  - `Call Waiter`, `Request Bill`, `Water`, `Cutlery`
  - `Orders`, `Yummy points`, `Rewards`
  - `Orders, points, rewards and restaurant updates in one place.`
  - `Dine, earn, return`

## Creative Direction
- Tone preset: polished
- Creative direction: warm premium hospitality with operational clarity
- Interpretation: controlled motion, readable UI crops, gentle camera movement, confident holds, and action-specific transitions
- Angle: the orange journey line is the guest’s visit moving through the product, never a decorative flourish
- Hook: a human table context before software, with the phone scanning the table QR
- Outro / punchline: the completed orange path becomes the dot beside the Yummy logo and `Dine, earn, return.`
- Avoid:
  - Slideshow or feature-card sequencing
  - Generic SaaS language or ungrounded claims
  - Invented totals, loyalty balances, ratings, testimonials, delivery estimates, personal data, tokens, or URLs
  - Decorative gradients, glassmorphism, particles, confetti, neon, 3D flips, kinetic copy, or unreadable full-page screenshots

## Visual Identity
- Background: `#f6f6f4`
- Text: `#10131a`
- Accent: `#ff6929`
- Paper surface: `#fffdf9`
- Display font: Outfit, with local system fallback if remote loading is unavailable
- Body font: Inter, with local system fallback if remote loading is unavailable
- Visual references from the project: rounded dark restaurant shell, compact bordered menu rows, orange focused states, stone dividers, dark Need something? panel, points circle, real Yummy logo, and real momo imagery

## Storyboard
Use `brag-plan.md` as the creative contract.

Scene summary:
1. The dining moment — 2.80s — table, phone, privacy-safe QR, and scanner lock
2. Connected to the restaurant — 3.00s — verified table state and Browse menu
3. Find the dish — 3.40s — Momo category, three real dish rows, Chicken momo selection
4. Make it yours — 3.30s — bottom sheet, Extra spicy, Special Instructions, Add to Cart
5. Send it to the table — 3.90s — active-table cart, Sending Request, order success
6. Need something? — 3.40s — Request Bill active state in the real service panel anatomy
7. The visit comes back with you — 3.40s — Orders, Yummy points, Rewards without fabricated balances
8. Brand resolution — 1.80s — real Yummy logo and `Dine, earn, return.`

## Audio
- Audio role: warm bed with sparse, professional interaction accents
- Audio arc: subtle physical-room identity for the opening, purposeful middle, warm resolved close
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`
- Music treatment: 0.22–0.28 posture, fade in over the first second, fade out over the final 0.8 seconds
- Music cue guidance: bundled preset at `C:\Users\PREDATOR\.codex\skills\brag\assets\music\cues\happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json`; optional locks at 8.74s, 19.66s, and 22.93s; logo lands on the 23.46s beat and then holds through 25.00s
- Audio-reactive treatment: unavailable because the Hyperframes domain-skill helper could not be installed in this session; do not block rendering and do not imitate a visualizer
- Audio-coupled moments:
  - 2.30s — QR lock
  - 5.00s — Browse menu press
  - 8.74s — Chicken momo/add emphasis
  - 10.45s — Extra spicy selection
  - 12.05s — Add to cart
  - 15.20s — order confirmation
  - 17.75s — Request Bill
  - 20.25s — history row placement
  - 23.46s — logo landing; 24.56s — music resolution under the held lockup
- SFX selection guidance: low-risk interface clicks, soft wood/soft impact, one restrained final bell
- SFX analysis guidance: `C:\Users\PREDATOR\.codex\skills\brag\assets\sfx\sfx-analysis.md`
- Exact SFX choice: match the implemented motion; keep all cues quiet and isolated
- Audio files: local copies under `composition/assets/`

## Hyperframes Instructions
The requested Hyperframes domain skills could not be installed because the update command timed out with no output. Use the pinned `hyperframes@0.8.134` CLI, the composition-local `AGENTS.md`, and local CLI docs as the safe fallback.

Requirements:
- Use one registered paused GSAP root timeline: `window.__timelines["yummy-menu-visit"]`.
- Use deterministic, seek-safe animation only. No current-time or random logic.
- The continuous orange journey line must visibly hand off between interactions.
- Show the real Yummy logo and actual food images copied from `public/menu_gallery/`.
- Keep all text readable and all scene content within 1920x1080 safe bounds.
- Preserve the exact 25.00-second duration.
- Use only shape carry, controlled horizontal push, and gentle focus pull transitions.
- Include the local music and SFX layer; no voice-over.
- Run `npx hyperframes check` before render and fix every error.
- Keep creation and rendering local; do not publish.
