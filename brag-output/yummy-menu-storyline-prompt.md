# Production Prompt: Yummy Menu — One Complete Restaurant Visit

Create a polished 25-second landscape product film for **Yummy Menu**, the customer-facing restaurant experience by Yummy. This must tell one continuous, understandable story about a diner completing a restaurant visit. It must not feel like a slideshow, a collection of feature cards, or a generic SaaS advertisement.

The story is:

> A customer sits down at a restaurant, scans the table QR, browses the real menu, customizes momo, places the table order, requests the bill, and finishes with the visit saved to their Yummy profile with points and rewards.

Every screen must appear because of the customer’s previous action. Preserve the causal chain. Do not cut to unrelated screens merely to demonstrate features.

## Format and tone

- Duration: exactly 25 seconds.
- Canvas: 1920×1080, 30 fps.
- Tone: warm, premium hospitality with operational clarity.
- Energy: calm at the beginning, purposeful through ordering, satisfying at the end.
- No voice-over. Tell the story through interaction, concise on-screen copy, sound, and motion.
- Use Yummy’s real visual identity:
  - warm background `#f6f6f4`
  - deep ink `#10131a`
  - primary orange `#ff6929`
  - paper surface `#fffdf9`
  - Outfit for display text
  - Inter for body text
- Preserve the actual application’s rounded surfaces, compact menu rows, dark restaurant header, orange actions, stone dividers, and information-first density.
- Use the real Yummy logo and food images from the repository.
- Use plausible fictional restaurant/session data only where dynamic data is unavoidable. Do not show real customer names, email addresses, phone numbers, QR tokens, internal URLs, API information, or credentials.

## Central visual device

Use one continuous **orange journey line** as the connective graphic through the film.

The line begins as the four corners of a table QR scanner. After verification, it collapses into the underline beneath the selected menu category. It then bends into the outline of the selected dish’s add button, becomes the selection ring inside the customization drawer, travels into the cart badge, forms the progress stroke of the “Order sent” confirmation, becomes the status line beside “Request Bill,” and finally curves into the circular accent around “Yummy points.”

This orange line is not decorative. It is the visual representation of the customer’s visit moving through Yummy. It must carry between screens and provide continuity.

## Camera and framing rules

- Use a gently floating camera that follows the active customer action.
- Begin outside the phone with a tactile restaurant-table context.
- Push into the phone only when the QR scan succeeds.
- Once inside the product, use controlled 2D camera moves: modest pushes, lateral tracking, and focus changes.
- Keep the active tap or selected control near a compositional anchor rather than centering every screen.
- Never show an entire desktop page as a tiny unreadable screenshot.
- Crop into the relevant product region while retaining enough surrounding UI to understand the screen.
- Mobile UI should feel like the real Yummy Menu responsive experience, not a generic phone mockup.
- Holds matter: after each key result, pause long enough for the viewer to understand what happened.

## Motion language

- All interaction must be deterministic and seek-safe.
- Entrances use ease-out motion; transitions between positions use ease-in-out.
- Buttons depress by 2–3% with a brief shadow reduction, then recover.
- Selected controls use orange through border, underline, ring, or fill—not orange floods.
- Text enters quickly and then holds. Do not remove readable copy immediately after it arrives.
- Avoid repeated fade-ups. Use different motion appropriate to each action:
  - scanning: corner convergence and controlled pulse
  - menu navigation: horizontal carry and underline travel
  - customization: bottom-sheet rise and selection-ring movement
  - order confirmation: cart compression into status mark
  - bill request: status change and restrained ripple
  - rewards: information regrouping into a calm profile composition
- No particles, confetti, decorative gradients, glassmorphism, neon glow, fake 3D card spins, floating feature badges, or arbitrary kinetic typography.

## Scene-by-scene storyboard

### Scene 1 — The dining moment

**Time:** 0.00–2.80 seconds  
**Purpose:** Establish a human situation before showing software.

Show a warm restaurant table from a slightly elevated three-quarter angle. Keep the environment minimal and stylized: warm stone tabletop, edge of a plate, folded napkin, drinking glass, and a small table stand carrying a Yummy QR code. A phone rests near the QR stand.

A hand enters naturally from the lower right, lifts the phone, and points it toward the table QR. Do not show a floating cursor in this real-world framing.

On-screen copy appears in the upper-left safe area:

> **Your table is ready.**

The text should enter in two stages: “Your table” first, then “is ready.” It must hold for at least 1.2 seconds after fully appearing.

The phone camera view expands slightly. Four thin orange scanner corners appear around the QR code. The corners breathe once, converge by a few pixels, and lock.

**Graphics:** The scanner corners introduce the orange journey line. Keep all other overlays absent.  
**Camera:** Slow 3% push toward the phone and QR.  
**Sound:** Quiet restaurant-room ambience, one soft phone lift sound, and a dry low click when the QR locks. Music begins almost imperceptibly.  
**Transition:** At verification, the QR square grows to fill the frame. Its orange scanner corners stretch horizontally and become the active underline in the restaurant home screen.

### Scene 2 — Connected to the restaurant

**Time:** 2.80–5.80 seconds  
**Purpose:** Confirm that the scan connected the customer to this restaurant and table.

Resolve from the enlarged QR into the actual Yummy restaurant home screen. Show the dark restaurant header and the real product hierarchy. The restaurant identity can use a fictional neutral name such as **Yummy Kitchen** only if live demo data is unavailable; do not invent ratings, testimonials, or performance claims.

Required visible UI:

- restaurant logo or Yummy fallback
- restaurant name
- the “Dine, earn, return” pill
- the verified table state
- “Browse menu” primary action

Show the verified state as:

> **Table connected**

Then allow the existing product message to take prominence:

> **Everything for your visit, in one place.**

Do not display both lines at equal visual weight. “Table connected” is a compact status. The product headline is the main read.

The hand is now represented as a clean touch indicator because the camera is inside the product. It taps **Browse menu**.

**Graphics:** The orange scanner line finishes becoming the underline/status rule beneath the connected-table label, then slides toward the Browse menu action.  
**Camera:** Begin on the table status, drift upward to the headline, then settle on Browse menu.  
**Motion:** Header and restaurant identity remain stable; only the active status and CTA receive motion.  
**Sound:** Soft connection confirmation, subtle room tone continues, restrained tap on Browse menu.  
**Transition:** The Browse menu button widens horizontally; its dark fill becomes the next screen’s menu header while the orange journey line exits from its lower edge and becomes the selected category indicator.

### Scene 3 — Find the dish

**Time:** 5.80–9.20 seconds  
**Purpose:** Show the product doing its core job: helping the customer choose food.

Show the real menu screen, framed close enough to read:

- restaurant header remains visible in reduced form
- menu title: **Find your next favourite.**
- search field: **Search the menu…**
- category navigation
- real food images from `public/menu_gallery/`
- compact dish rows
- add controls

Start with the category strip moving horizontally by a small amount as the orange journey line slides under **Momo**. The menu content updates in place rather than cutting to a different page.

Reveal three momo dishes in a vertically staggered but readable sequence. Use repository food imagery. Each row should settle before the next receives emphasis. Avoid showing fabricated prices; if verified demo pricing is unavailable, crop or compose the rows so pricing is not the focus.

The customer selects **Chicken momo**. Its row gains a subtle orange border emphasis and moves forward by 1–2% scale. The plus button compresses under the touch.

Minimal contextual copy appears briefly in unused space:

> **Choose what feels right.**

This is connective narration, not a product claim. Keep it secondary to the real UI.

**Graphics:** Orange journey line becomes the Momo category underline, runs along the selected Chicken momo row, and curls around the plus button.  
**Camera:** Lateral track from category navigation to dish rows; small push into Chicken momo at selection.  
**Motion:** Food images stay stable; the hierarchy is created through row emphasis, not floating cards.  
**Sound:** Two soft menu movement sounds, one quiet tactile add click. No sound on every row.  
**Transition:** The orange ring around the plus button expands into the grab handle and upper contour of the customization bottom sheet.

### Scene 4 — Make it yours

**Time:** 9.20–12.50 seconds  
**Purpose:** Show customization as part of the ordering story, not a disconnected feature.

The real customization drawer rises from the bottom while the menu remains visible and slightly defocused behind it. Preserve the application’s bottom-sheet anatomy.

Required visible content:

- **Chicken momo**
- required-choice indicator where appropriate
- modifier choices such as **Regular**, **Extra spicy**, or a verified available modifier
- **Special instructions**
- **Add to cart** action

The touch indicator selects **Extra spicy**. The orange journey line leaves the sheet handle, travels down the edge of the active option, and resolves into its selection ring. The chosen row should change through border and fill, not a flashy bounce.

Then the touch taps **Add to cart**. The button depresses, the drawer lowers by a few pixels, and the dish thumbnail compresses into a small moving token.

**Graphics:** One orange selection ring; no checkmark explosion or celebratory decoration.  
**Camera:** Static during selection for clarity; subtle follow-down as the item token travels toward the cart.  
**Motion:** Drawer entrance 0.45–0.60 seconds; option selection 0.20 seconds; hold the selected state for at least 0.7 seconds.  
**Sound:** Soft sheet movement, one low selection click, one warm add confirmation.  
**Transition:** The dish token follows the orange line into the floating cart badge. The camera follows the token, allowing the cart to expand into the next screen.

### Scene 5 — Send it to the table

**Time:** 12.50–16.40 seconds  
**Purpose:** Complete the primary task and show that this is restaurant table ordering, not delivery.

Open the real cart/order surface. The context must clearly indicate an active restaurant table session.

Required visible content:

- ordered/draft item distinction if available
- Chicken momo with selected modifier
- current table context
- total hierarchy without invented numbers
- **Place Order** action

If an actual demo session with verified totals is available, use it. Otherwise, keep monetary values out of focus and do not fabricate them.

The touch taps **Place Order**. The action label briefly changes to the real loading state:

> **Sending Request**

Then resolve to a restrained success state using the product’s actual language or an existing success status. Do not invent delivery estimates.

The cart badge collapses. The orange journey line draws a short forward stroke and becomes the order-status rule.

Contextual line, displayed only after the order succeeds:

> **Order sent to the restaurant.**

Use this only if it matches the implemented success behavior; otherwise use the application’s exact existing success copy.

**Graphics:** Cart count becomes a simple status mark. No confetti.  
**Camera:** Gentle push toward Place Order, then hold on the confirmed result.  
**Motion:** Button loading indicator rotates deterministically; success settles without bounce.  
**Sound:** Low button press, quiet sending texture, grounded success tone. Music reaches its most purposeful point here.  
**Transition:** The horizontal order-status rule continues across the frame and reveals the table service panel beneath it.

### Scene 6 — Need something?

**Time:** 16.40–19.80 seconds  
**Purpose:** Show that Yummy continues supporting the customer during the visit.

Reveal the real dark **Need something?** service panel while keeping enough menu/table context visible to understand where it belongs.

Required actions:

- Call Waiter
- Request Bill
- Water
- Cutlery

The touch taps **Request Bill**. The selected action should not explode or become a marketing card. It changes into the real active/cooldown state, using the restrained status treatment already present in the product.

On-screen connective copy appears above the panel:

> **Still your table. Still one place.**

The line is storytelling copy and should remain smaller than the product interface.

The orange journey line moves from the order status into the Request Bill row. After the tap, it becomes a short progress/status line and then exits toward the profile icon in the navigation.

**Camera:** Pan from order confirmation down to the service panel, then track toward the profile navigation control.  
**Motion:** Other service actions remain still. Only Request Bill changes state.  
**Sound:** One soft tap and a muted floor-service confirmation. Restaurant ambience begins to recede.  
**Transition:** The orange line reaches the profile icon; the icon enlarges into the circular accent on the rewards/profile screen.

### Scene 7 — The visit comes back with you

**Time:** 19.80–23.20 seconds  
**Purpose:** Deliver the emotional payoff: this visit becomes part of the customer’s ongoing relationship with the restaurant.

Show the real customer profile/rewards experience. This screen must look like a calm result of the visit, not another list of features.

Required visible areas:

- Orders
- Yummy points
- Rewards or offers
- restaurant updates, if space permits

Show an order row settling into history, then let the eye move to the **Yummy points** panel. Do not animate fake points counting upward unless a verified demo response provides the exact value. If the data is unavailable, emphasize the labels and relationship rather than numbers.

Main line:

> **This visit stays with you.**

Supporting line, smaller:

> Orders, points, rewards and restaurant updates in one place.

The orange journey line becomes the circular accent in the points panel, completing the visual path that began at the table QR.

**Graphics:** The complete orange path may briefly ghost behind the profile composition at 8–10% opacity, showing scan → menu → cart → bill → rewards as one continuous route. Keep it subtle and remove it before the end card.  
**Camera:** Slow pull back to reveal the profile composition as a whole.  
**Motion:** Order row settles first; points panel second; supporting areas remain stable.  
**Sound:** Warm resolved chord, one soft paper-like placement for the history row.  
**Transition:** The circular orange accent closes into a dot, and the surrounding UI gently recedes into the warm canvas.

### Scene 8 — Brand resolution

**Time:** 23.20–25.00 seconds  
**Purpose:** Close the story without introducing another feature.

On the warm Yummy canvas, the orange dot lands beside the Yummy logo. The wordmark enters with a short confident horizontal movement.

Final copy:

> **Dine, earn, return.**

Optional small supporting label:

> **Yummy Menu**

Do not add a fake URL, download badge, metric, or call to action unless it exists in the project and is explicitly requested.

Hold the completed lockup for at least 1.1 seconds. Select this settled frame as a poster candidate.

**Graphics:** Only logo, orange dot, tagline, and one fine stone divider.  
**Camera:** Completely still. Stillness is the final contrast to the journey.  
**Sound:** Music resolves; one warm low-impact logo sound; allow a short tail into silence.

## Transition system

Use three transition types only:

1. **Shape carry** for QR → restaurant home, plus button → customization sheet, cart token → cart, and profile icon → points circle.
2. **Controlled horizontal push** for restaurant home → menu and order → service panel.
3. **Gentle focus pull** for profile → final brand resolution.

Do not use unrelated transition styles between every scene. No glitch, flash, film burn, 3D flip, grid dissolve, or zoom explosion.

Outgoing content must remain visible until the transition begins. Do not fade every element out before transitioning. The transition itself performs the handoff.

## Interface authenticity requirements

- Reuse or faithfully rebuild the actual Yummy components and their responsive anatomy.
- Preserve exact labels from the current project wherever the UI supplies them.
- Use actual repository food imagery and logo assets.
- Do not redesign the product into a concept UI.
- Do not show desktop navigation inside a mobile phone frame.
- Do not place unreadable full-page screenshots in decorative device frames.
- Do not invent unavailable backend results.
- Use fictional placeholders only for restaurant identity or session content when required, clearly keeping them generic.
- No real personal/customer data may appear.

## Text hierarchy and readability

- Maximum one main narrative sentence per scene.
- Product labels remain subordinate to the current action.
- Main story headline: 60–96 px depending on framing.
- UI text must remain at a readable video scale; crop the screen rather than shrinking it.
- Hold short labels for at least 0.8 seconds after their entrance.
- Hold full-sentence narrative copy for approximately 0.3 seconds per word, with at least 1.2 seconds settled.
- Never reveal multiple readable lines on consecutive fast beats.

## Audio direction

- Build one warm, lightly rhythmic music bed with a clear beginning, purposeful middle, and resolved ending.
- Preserve a subtle restaurant-room identity at the beginning and let it disappear as the film moves inside the product.
- Use sparse, motion-matched effects:
  - QR lock
  - Browse menu tap
  - modifier selection
  - add-to-cart confirmation
  - place-order success
  - request-bill confirmation
  - profile/history placement
  - final logo landing
- Do not add a click to every movement.
- Avoid bright casino-style pings, notification spam, keyboard sounds, and exaggerated whooshes.
- Music may subtly affect background warmth or depth, but never create equalizer bars, waveforms, pulsing text, or visible music graphics.

## Explicitly prohibited outcomes

- No opening with the logo followed by disconnected feature screens.
- No “feature 1 / feature 2 / feature 3” card sequence.
- No generic restaurant montage unrelated to the actual product.
- No delivery-driver imagery; this is a restaurant/table experience.
- No fabricated claims such as faster service, guaranteed rewards, or specific savings.
- No invented testimonials, ratings, order totals, loyalty-point totals, or restaurant statistics.
- No abstract orange shapes used as filler.
- No excessive copy.
- No scene may exist solely because the product has that screen; it must advance the customer’s visit.

## Acceptance criteria

The film is successful only if a first-time viewer can answer all five questions after one viewing:

1. Where is the customer? — At a restaurant table.
2. What starts the experience? — Scanning the table QR.
3. What do they accomplish? — Browse, customize, and place a restaurant order.
4. What happens during and after the meal? — They can request service or the bill, and the visit is saved with points/rewards.
5. What is Yummy’s promise? — The restaurant visit lives in one connected customer experience: **Dine, earn, return.**

Before rendering, inspect settled frames from every scene and at every transition. Fix illegible UI, collisions, overflow, low contrast, blank holds, and muddy double exposures. The final result must feel like one complete visit, not eight adjacent advertisements.
