# NOlida UI Patterns & Reference Apps

For every user-facing feature, NOlida borrows its UX pattern from the
best-in-class app for that specific use case. Copy patterns, never
code, assets, logos, or branding.

## Feature → Reference Map

### Social & Content
| Feature | Primary | Secondary |
|---|---|---|
| Home feed | Instagram | Twitter/X |
| Post composer | Instagram | Facebook |
| Profile (own) | Instagram | Twitter/X |
| Profile (other) | Instagram | — |
| Search & discover | Pinterest | Instagram Explore |
| Notifications | Instagram | Twitter/X |

### Messaging (Phase 10+)
| Feature | Primary | Secondary |
|---|---|---|
| Chat list | WhatsApp | iMessage |
| Chat window | WhatsApp | iMessage |
| Voice notes | WhatsApp | Telegram |
| Reactions | iMessage | WhatsApp |
| Reply threading | WhatsApp | Telegram |
| Forward | WhatsApp | Telegram |
| Pin / mute | WhatsApp | Telegram |
| Calls (Phase 10.5) | WhatsApp | Messenger |

### Marketplace & Commerce
| Feature | Primary | Secondary |
|---|---|---|
| Product listing | Shopify | Amazon |
| Product detail | Shopify | Amazon |
| Cart | Shopify | Amazon |
| Checkout | Stripe | Shopify |
| Orders | Shopify | Amazon |

### Services & Bookings
| Feature | Primary | Secondary |
|---|---|---|
| Service card | Fiverr | Upwork |
| Service detail | Fiverr | Upwork |
| Business profile (public) | Airbnb | Fiverr |
| Booking flow | Calendly | — |
| Availability editor | Calendly | Google Calendar |
| Requests | Upwork | Fiverr |
| Request detail | Upwork | — |
| Quotes | Upwork | Stripe |
| Reviews | Airbnb | Fiverr |

### Wallet & Payments
| Feature | Primary | Secondary |
|---|---|---|
| Wallet home | Revolut | Cash App |
| Transaction history | Revolut | Wise |
| Transaction detail | Revolut | Wise |
| Add money | Revolut | Wise |
| Withdraw | Wise | Revolut |
| Payouts (business) | Stripe | — |

### Business Dashboard
| Feature | Primary | Secondary |
|---|---|---|
| Dashboard overview | Shopify | Stripe |
| Analytics | Shopify | PostHog |
| Earnings | Stripe | — |
| Products management | Shopify | — |
| Services management | Fiverr | Upwork |
| Bookings management | Calendly | — |
| Orders management | Shopify | — |
| Customers | Shopify | — |
| Promotions | Meta Ads Manager | Shopify |

### Auth & Onboarding
| Feature | Primary | Secondary |
|---|---|---|
| Sign up | Instagram | Duolingo |
| Login | Instagram | — |
| OTP verification | WhatsApp | Telegram |
| Complete profile | Instagram | LinkedIn |
| Mobile welcome | Noise app | — |

### Settings & Account
| Feature | Primary | Secondary |
|---|---|---|
| Settings home | TikTok | iOS Settings |
| Account settings | iOS Settings | Instagram |
| Security | Apple ID | Google Account |
| Appearance | iOS | — |
| Notifications settings | Instagram | TikTok |

### Trust & Safety (Phase 17+)
| Feature | Primary | Secondary |
|---|---|---|
| Reports | Instagram | Twitter/X |
| Blocking | Instagram | — |
| Verification | Twitter/X | Instagram |

### Admin Panel (Phase 18+)
| Feature | Primary | Secondary |
|---|---|---|
| Admin dashboard | Linear | Stripe |
| Admin tables | Linear | Stripe |
| Business approvals | Stripe | Linear |
| Financial dashboards | Stripe | — |
| Audit logs | Linear | — |

## Micro-interaction library

- Double-tap to like — Instagram (heart scale-up, fade)
- Pull to refresh — Twitter/X
- Swipe to reply — WhatsApp
- Swipe to delete — iOS Mail
- Bottom sheet — iOS / Instagram
- Toasts — Material / iOS
- Command palette — Linear / Vercel (Cmd+K)
- Empty states — Notion (icon, title, description, CTA)
- Loading skeletons — Facebook (gray shapes)
- Optimistic UI — Twitter/X

## Golden rules

1. Copy UX patterns — never code, assets, logos, exact colors, or fonts.
2. When two references exist, the first is primary.
3. Nigerian context wins (WhatsApp voice notes, naira-first amounts).
4. When in doubt, choose the simpler pattern.
5. Every new feature must have a designated reference before implementation.
