# Phase 5A — the signed-in app shell

Phase 5A builds the frame every signed-in screen lives in, and the gate that
lets you reach it. `/home` — the 404 a successful sign-in used to land on — is
now a real screen, `/profile` and the settings index carry real content, and
every other destination the navigation promises exists and says honestly what
it is waiting for.

Phase 5 is sliced in two because the frame and the content inside it fail
differently: 5A owns the gate, the chrome and the destinations; **5B** owns
profile editing and the settings that can actually be changed. This file is the
record of 5A. Auth screens are described in `docs/AUTH-UI.md`; the backend
below them in `docs/AUTH.md`.

## What changed

| Before | After |
| --- | --- |
| `/home` did not exist — sign-in landed on a 404 | `/home` renders the dashboard inside the shell |
| `/` always rendered the sign-in screen | `/` redirects a visitor who already holds a live session to `/home` |
| No signed-in surface at all | `src/app/(main)/` — sidebar, two top bars, bottom nav, profile drawer |
| No sign-out control | Sign Out lives in the profile drawer and goes through `POST /api/auth/logout` |

## The route group and the guard

Every signed-in screen lives in `src/app/(main)/`. The guard is one `redirect()`
in `(main)/layout.tsx`, not a check sprinkled through pages:

- `getCurrentSessionUser()` (`src/lib/server/auth/current-user.ts`) reads the
  cookie, looks the session up, and returns the user or `null` — `null` covers a
  missing cookie, an expired session, a revoked one, and an account that is no
  longer `ACTIVE`.
- `null` → `redirect("/")`, which is the sign-in screen.
- A database failure is *not* `null`. It propagates, so an outage reads as an
  error rather than as "signed out".
- The layout exports `dynamic = "force-dynamic"` so a future static export can
  never cache one person's shell and serve it to everyone.

Server Components read the cookie through a new `readSessionToken()` in
`src/lib/server/auth/session-cookie.ts` — Server Components have no
`NextRequest`, so it goes through `cookies()`. Route Handlers keep using
`readSessionCookie(request)`; both helpers live beside the private
`COOKIE_NAME`, so the cookie name still exists in exactly one module.

`/` calls the same helper: a live session redirects to `/home`, everything else
renders the sign-in screen. The check is free for anonymous visitors — with no
cookie, no database query happens.

## The shell

| Component | Type | Note |
| --- | --- | --- |
| `AppShell` | Server | Layout only: sidebar, chrome, `<main>`, bottom nav |
| `AppShellChrome` | Client | The one client island — two top bars + drawer and the `profileOpen` boolean they share |
| `DesktopSidebar` | Client | `SIDEBAR_NAV`, highlights the active item |
| `TopBarMobile` / `TopBarDesktop` | Client | Search, notifications, cart, avatar |
| `MobileBottomNav` | Client | `MOBILE_NAV`, Create centred |
| `ProfileDrawer` | Client | Account links, Sign Out, disabled theme switch |
| `AvatarButton` | Server | Initials fallback via `initialsOf` |
| `CartButton` / `NotificationButton` | Server | Badge renders only above zero, count spoken via `aria-label` |

`AppShell` is deliberately not a guard. It is a frame that looks authenticated;
the security decision is the `redirect()` in the layout, and the comment in the
component says so, because a shell that merely looks safe is worse than none.

The desktop top bar's search is a plain GET form to `/discover?q=…` — it works
without JavaScript and without a client-side router call.

## Navigation, declared once

`src/components/layout/navigation.ts` is the single source for every
destination: `MOBILE_NAV` (five tabs, `CREATE_HREF` centred), `SIDEBAR_NAV`
(the daily destinations) and `DRAWER_SECTIONS` (account and support). A route
cannot be added to one bar and forgotten in another, and no bar hardcodes a
second list.

## Screens

Three screens carry real content:

- `/home` — `HomeDashboard`. Greets the user by the same name the drawer shows
  (both come from `toShellUser`), then routes them to the four places they will
  actually go: Discover, My business, Wallet, Orders. Where a feed will someday
  be there is one honest empty state — a home screen wired to four placeholders
  must not promise a stream it cannot fill.
- `/profile` — `ProfileOverview`. Name, handle and avatar (initials fallback
  while uploads do not exist), verification badges read from the session, and
  "Member since" formatted on the server so the locale is deterministic. No
  post grid, no follower counts, no earnings — one empty state instead.
- `/settings` — `SettingsMenu`. Ten rows in four groups (Account, Money,
  Preferences, Support). Three rows point at top-level screens (`/profile`,
  `/wallet`, `/my-business`) rather than nesting the same screen under
  `/settings`. There is no "Delete account" row on purpose: deleting needs a
  confirmation flow and a retention decision, and neither exists yet.

Every other destination renders `PagePlaceholder` with its scope stated:
`/cart`, `/create`, `/discover`, `/messages`, `/my-business`, `/notifications`,
`/orders`, `/wallet`, and `/settings/{appearance,developer,help,notifications,
payment-methods,privacy-security,sessions}`.

The rule all of them follow: **state the scope, never fake the data.** No
invented balance, no zero-count badge, no plausible list. Badges render only
above zero — a permanently-lit bell trains people to ignore it. `/settings/help`
points at the public `/help` rather than duplicating answers that would drift.

## Session-aware identity, client-safe

`src/lib/client/shell-user.ts` maps a `SessionUser` onto the `ShellUser` shape
once, in the layout. It imports nothing from `src/lib/server/`, so Client
Components can depend on it without breaking the rule that no component
reaches into server code. It carries display fields only — anything a screen
must *trust* (balance, role, verification) is re-read from the session on the
server.

## Verification

Run on this exact tree:

- `npm run build` — exit 0; the route table lists 43 routes, 29 of them
  dynamic (ƒ). Every `(main)` route is dynamic, because the shell reads a
  session cookie on the server; the auth and marketing routes keep their
  previous static/dynamic split.
- `eslint .` — 0 problems.
  - Three genuine unused-binding warnings were fixed: a stale `Lock` import in
    `SettingsMenu`, a stale `ShellUser` type import in `TopBarDesktop`, and the
    `_passwordHash` strip in `getSessionUser` — the last by teaching the ESLint
    config the `^_` convention instead of deleting a safety pattern.
  - The five post-auth full-document navigations (signup → `/verify`,
    verify → `/home`, forgot → `/reset-password`, reset → `/?reset=1`,
    sign out → `/`) now carry explicit `no-location-assign-relative-destination`
    exemptions, each with its reason. A router push is wrong for all five: the
    next render must come from the server with the cookie already set or
    cleared.
  - `.kilo/**` was added to the lint ignores: local agent worktrees are a
    second checkout of this repo, not app code.
- Not verified here: an interactive browser pass (sign in → `/home` → sign
  out). The guard and the redirects were exercised statically through the
  build's route classification and read by hand.

## What Phase 5A deliberately does not do

- No feed, counts or history on `/home` or `/profile` — publishing and orders
  are later phases.
- The theme switch in the drawer is disabled until a theme preference can
  actually be saved.
- Search submits to `/discover`, which is still a placeholder: the GET-form
  mechanics are real, the results are not.
- No post-auth redirect table for deep links; `/home` is the one destination.

## Where this goes next

**5B** turns `/profile` and the settings rows into editable screens backed by
the API. Nothing built here moves for it: 5B fills screens that already exist,
already render inside the shell, and already have their home in
`navigation.ts`.
