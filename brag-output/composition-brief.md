# Hyperframes Composition Brief: Yummy Menu

## Objective
Create a 20-second launch-style video for Yummy Menu that demonstrates a connected restaurant visit through the actual customer product.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `C:\Users\PREDATOR\OneDrive\Desktop\yummy-menu`
- Primary files read: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/[slug]/[name]/page.tsx`, `src/components/MenuGrid.tsx`, `src/components/RestaurantExperienceHome.tsx`, `src/components/MenuItemCard.tsx`, `src/components/ItemCustomizationDrawer.tsx`, `src/components/FloatingCart.tsx`, `src/components/TableServiceActions.tsx`, `src/components/CustomerProfile.tsx`, `src/app/globals.css`, `tailwind.config.ts`
- Product name: Yummy Menu
- Tagline / strongest claim: “Everything for your visit, in one place.”
- Key UI or visual moment to recreate: dark restaurant home → light menu and food rows → customization and table order → customer points and history
- Copy that must appear verbatim:
  - “Everything for your visit, in one place.”
  - “Browse menu”
  - “Find your next favourite.”
  - “Scan the table QR to order”
  - “Orders, points, rewards and restaurant updates in one place.”
  - “Dine, earn, return”

## Creative Direction
- Tone preset: polished
- Creative direction: warm premium hospitality, operationally real
- Interpretation: product-first, confident, and restrained; use motion to connect real actions instead of displaying generic feature cards
- Angle: one restaurant visit travels across a single Yummy customer surface, from discovery to the return relationship
- Hook: the actual restaurant hero and “Everything for your visit, in one place.”
- Outro / punchline: “Dine, earn, return.” with the Yummy mark
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Invented metrics, testimonials, restaurants, or customer information
  - Delivery-app tropes that are not present in the product
  - Decorative gradients, particles, or excessive glow

## Visual Identity
- Background: `#f6f6f4`
- Text: `#10131a`
- Accent: `#ff6929`
- Display font: Outfit
- Body font: Inter
- Visual references from the project: rounded dark restaurant hero, orange primary actions, white/light menu surface, compact dish rows, food imagery from `public/menu_gallery/`, dark service-action panel, profile points panel

## Storyboard
Use `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. One place — 3.70s — Yummy mark, real hero copy, and “Dine, earn, return”
2. Browse the restaurant — 4.74s — restaurant home carries into a real menu with food rows and NPR prices
3. From dish to table — 6.32s — select, customize, connect table, show order total and service actions
4. Return is part of the visit — 5.24s — orders, rewards, points, updates, and final Yummy lockup

## Audio
- Audio role: warm bed with sparse professional accents
- Audio arc: gentle open, slightly more motion through menu and order actions, then a clean resolve
- Music: `assets/music/happy-beats-business-moves-vol-9-by-ende-dot-app.mp3`
- Music treatment: restrained under product interaction; fade beneath final logo
- Music cue guidance: bundled cue preset; major reveal candidates 3.70s, 8.44s, and final landing around 20.02s; use alternating beat points for readable sequences
- Audio-reactive treatment: subtle dark-surface warmth and orange focus presence only; skip if extraction remains unavailable
- Audio-coupled moments:
  - Browse menu — quiet tap and scene carry
  - Dish customization — restrained selection cues
  - Table total — grounded confirmation
  - Final Yummy mark — single soft landing
- SFX selection guidance: prefer low/medium high-frequency-risk interface sounds and avoid repeated bright pings
- SFX analysis guidance: `C:\Users\PREDATOR\.codex\skills\brag\assets\sfx\sfx-analysis.md`
- Exact SFX choice: Hyperframes should choose filenames, timestamps, density, and volume after the visual animation exists
- Audio files: copy selected assets under `brag-output/composition/assets/`

## Hyperframes Instructions
Use the currently installed Hyperframes composition and CLI guidance. Brag owns the product story and verified copy; Hyperframes owns composition mechanics and exact animation timing.

Requirements:
- Show real Yummy UI anatomy and real repository assets.
- Keep all required copy readable at 1920x1080.
- Keep the video at 20 seconds.
- Preserve the exact brand palette and Outfit/Inter typography.
- Use deterministic, seek-safe GSAP timelines.
- Use transitions between every scene and entrance motion for every scene.
- Keep creation and rendering local.
- Run `npx hyperframes check` before render.
- Do not publish or upload the result.
