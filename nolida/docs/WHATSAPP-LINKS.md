# WhatsApp Entry Points

Every WhatsApp link in noLIDA uses a context-specific message so the
support team knows what the visitor wants before they even open the chat.

The number is read from `NEXT_PUBLIC_SUPPORT_WHATSAPP` (digits only, no
`+`, no spaces).

| # | Location | Message |
|---|---|---|
| 1 | Mobile welcome screen (icon) | Hi noLIDA, I have a question about the app. |
| 2 | /explore contact section | Hi noLIDA, I have a question about noLIDA. |
| 3 | /for-business page | Hi noLIDA, I want to list my business on noLIDA. |
| 4 | /list-your-business page | Hi noLIDA, I want to list my business on noLIDA. |
| 5 | /help page | Hi noLIDA, I need help with my account. |
| 6 | /my-business/pending (support) | Hi noLIDA, I need help with my business submission. |
| 7 | /my-business/pending (rejected) | Hi noLIDA, I need help with my rejected business submission. |
| 8 | Footer (general) | Hi noLIDA, I have a question. |

All links use the format:

  https://wa.me/<number>?text=<url-encoded message>

If `NEXT_PUBLIC_SUPPORT_WHATSAPP` is not set, the icon renders as a
disabled state with a tooltip "WhatsApp not configured". Never render a
broken link.