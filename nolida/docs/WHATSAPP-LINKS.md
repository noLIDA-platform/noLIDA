# WhatsApp Entry Points

Every WhatsApp link in NOlida uses a context-specific message so the
support team knows what the visitor wants before they even open the chat.

The number is read from `NEXT_PUBLIC_SUPPORT_WHATSAPP` (digits only, no
`+`, no spaces).

| # | Location | Message |
|---|---|---|
| 1 | Mobile welcome screen (icon) | Hi NOlida, I have a question about the app. |
| 2 | /explore contact section | Hi NOlida, I have a question about NOlida. |
| 3 | /for-business page | Hi NOlida, I want to list my business on NOlida. |
| 4 | /list-your-business page | Hi NOlida, I want to list my business on NOlida. |
| 5 | /help page | Hi NOlida, I need help with my account. |
| 6 | /my-business/pending (support) | Hi NOlida, I need help with my business submission. |
| 7 | /my-business/pending (rejected) | Hi NOlida, I need help with my rejected business submission. |
| 8 | Footer (general) | Hi NOlida, I have a question. |

All links use the format:

  https://wa.me/<number>?text=<url-encoded message>

If `NEXT_PUBLIC_SUPPORT_WHATSAPP` is not set, the icon renders as a
disabled state with a tooltip "WhatsApp not configured". Never render a
broken link.