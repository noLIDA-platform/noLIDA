# Environment Configuration Reference

The application uses environment variables for database connectivity, security, and third-party integrations.

## Required Variables

| Variable | Description | Stage Required | Example |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (Supabase connection pooler recommended: port 6543) | Phase 0+ | `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require` |
| `SESSION_SECRET` | Secret key used for cryptographic session signing and encryption | Phase 0+ | High-entropy 64-character hex/random string |
| `JWT_SECRET` | Secret key used for signing and validating JWT tokens | Phase 0+ | High-entropy 64-character hex/random string |
| `RESEND_API_KEY` | Resend communication API key for transactional emails | Phase 0+ | `re_123456789...` |
| `NEXT_PUBLIC_SITE_URL` | Canonical deployment URL for CORS, callback verification, and redirects | Phase 0+ | `https://nolida.vercel.app` or `http://localhost:3000` |

## Security Policy
- Never commit `.env`, `.env.local`, or any populated secret files to version control.
- `.env.example` documents all keys with blank values and is tracked in Git.
