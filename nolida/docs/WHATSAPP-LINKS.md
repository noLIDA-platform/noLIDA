# WhatsApp Entry Points

Every WhatsApp link in NOLIda uses a context-specific message so the
support team knows what the visitor wants before they even open the chat.

The number is read from `NEXT_PUBLIC_SUPPORT_WHATSAPP` (digits only, no
`+`, no spaces).

| # | Location | Message |
|---|---|---|
| 1 | Mobile welcome screen (icon) | Hi NOLIda, I have a question about the app. |
| 2 | /explore contact section | Hi NOLIda, I have a question about NOLIda. |
| 3 | /for-business page | Hi NOLIda, I want to list my business on NOLIda. |
| 4 | /list-your-business page | Hi NOLIda, I want to list my business on NOLIda. |
| 5 | /help page | Hi NOLIda, I need help with my account. |
| 6 | /my-business/pending (support) | Hi NOLIda, I need help with my business submission. |
| 7 | /my-business/pending (rejected) | Hi NOLIda, I need help with my rejected business submission. |
| 8 | Footer (general) | Hi NOLIda, I have a question. |

All links use the format:

  https://wa.me/<number>?text=<url-encoded message>

If `NEXT_PUBLIC_SUPPORT_WHATSAPP` is not set, the icon renders as a
disabled state with a tooltip "WhatsApp not configured". Never render a
broken link.