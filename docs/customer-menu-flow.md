# Mobile customer menu

Both printed `/qr/{token}` links and the camera scanner connect the table and open
the restaurant menu. `/v/{token}` remains a redirect to the QR route. Customer
sign-in runs before dishes are requested. The table context survives sign-in.
Following the restaurant and marketing choices are separate profile actions.

On phones, Menu, Order and Profile are accessible through bottom navigation.
Desktop uses a category rail, two dish columns, and a separate order summary.
Customer home uses Discover and Profile. Customization and receipt dialogs close
with Escape or the backdrop, trap focus, and restore scrolling when closed.

The global profile starts with an account card and followed restaurants. Account
editing is separate from restaurant activity. Opening a restaurant loads its
orders, rewards, payments and communication preferences; those requests do not
block the profile landing page. Activity URLs retain the selected restaurant and
section, and browser Back restores the preceding profile screen.

Drafts are stored per restaurant in `yummy_cart`. Customized versions have separate
identities including notes and modifier IDs. Draft estimates include modifier
prices; the restaurant remains authoritative for taxes, charges and discounts.
Sent orders are requests awaiting restaurant acceptance, not kitchen confirmations.

401 responses refresh the customer session once. Failed authentication or a
temporary connection failure preserves the draft and table context. QR 404/410
responses end an invalid table session. The removed debug QR bypass must not be
reintroduced.

## Verification

- `npm test`: variant quantities, modifier totals, notes, restaurant isolation,
  and table-session error classification.
- `npx tsc --noEmit` and `npm run lint`.
- `npm run build` (or `YUMMY_BUILD_DIR=.next-verification npm run build` to avoid
  disturbing a running development server).
- Browser checks with mocked customer/menu/order responses at widths 360, 390,
  768, 1024 and 1440: sign-in gate, QR continuity, customization, request submission,
  401 retry, network retention, modal cleanup, and profile/discovery overflow.

Real OTP delivery, Google sign-in and camera permissions require device/account
verification. Backend changes must be deployed alongside the customer client for
server-side enforcement of menu authentication.
