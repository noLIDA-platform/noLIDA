# Media & Uploads (Phase 5C)

Photos and videos across NOlida. Files live at Cloudinary; **NOlida stores only
URLs**. No file is ever written to the server filesystem or into Postgres.

---

## Cloudinary setup

Three env vars, in `.env.local` locally and in Vercel for production:

```
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

The secret never reaches the browser. Uploads are **signed**: our server issues
a signature, and the browser posts the bytes straight to Cloudinary. There is no
unsigned upload preset and no `next-cloudinary` — a widget with an unsigned
preset would let anyone with a browser upload to your account without a
session.

If the vars are missing, `/api/upload/signature` returns
`500 STORAGE_NOT_CONFIGURED` and logs it server-side. The user sees "Photo
uploads are not available right now."

### Folder layout

`purpose` maps to a provider folder:

| purpose    | folder                | used by                     |
| ---------- | --------------------- | --------------------------- |
| `avatar`   | `nolida/avatars`      | Settings → Account          |
| `post`     | `nolida/posts`        | Post composer               |
| `business` | `nolida/businesses`   | Business cover/logo/gallery |
| `product`  | `nolida/products`     | Product editor              |

Only posts may contain videos. `purpose=avatar` with `kind=video` is rejected —
otherwise a 50 MB video ends up in a profile picture.

---

## The storage adapter

```
src/lib/server/adapters/storage/
  storage.interface.ts   StorageAdapter, UploadResult, UploadOptions
  cloudinary.adapter.ts  the only file that knows Cloudinary exists
  index.ts               exports `storage` — "switch providers here"
```

Callers import `storage` from `index.ts`. That is the whole point: the upload
route, the uploader component and the services know nothing about HTTP,
signatures or public IDs.

### Switching providers

1. Write a new file implementing `StorageAdapter`.
2. Change one line in `index.ts`.

```ts
export const storage: StorageAdapter = s3Adapter;
```

Nothing else changes. `UploadResult` is the contract, and it is deliberately
provider-neutral: `url`, `secureUrl`, `publicId`, dimensions, format, bytes.

---

## Validation rules

Enforced in `src/lib/server/validators/file.validator.ts`, in this order.

**This table describes the `/api/upload` fallback path.** On the direct path
(Phase 5C.2) the file never reaches our server, so the equivalent gate is the
signed `allowed_formats`, which Cloudinary enforces instead. The rules below are
still the ones a user experiences — they are simply enforced somewhere else now.

| Check | Rule |
| ----- | ---- |
| Empty | `size <= 0` rejected |
| Filename | `..`, `/`, `\`, NUL rejected |
| Size | images ≤ 5 MB, videos ≤ 50 MB |
| Extension | jpg/jpeg/png/webp/gif, mp4/webm/mov/m4v |
| Declared MIME | must match the extension |
| **Magic bytes** | must match the declared type and the `kind` |

### Why the last row matters

`File.type` is a string the user controls. Renaming a script to `photo.jpg` and
telling the browser it is `image/png` passes every metadata rule. `sniffMimeType`
reads the first bytes instead:

```
PNG   89 50 4E 47 0D 0A 1A 0A
JPEG  FF D8 FF
GIF   "GIF87a" / "GIF89a"
WebP  "RIFF" .... "WEBP"
MP4   "....ftyp" at offset 4   (ftypqt = QuickTime, else MP4)
WebM  1A 45 DF A3              (Matroska container)
```

All three must agree. A PNG presented as a video is rejected, which also stops
anyone using the 50 MB video ceiling to smuggle a large file past the 5 MB image
one.

SVG is **not** on the list. It is XML that executes script when rendered inline,
and a user-supplied avatar is exactly the place that turns into stored XSS.

### Client-side checks are a courtesy

`src/lib/client/upload.ts` duplicates the allow-list so a 60 MB video fails
instantly instead of after a slow upload. It is data, not logic, and the server
re-does all of it. A Client Component cannot import from `src/lib/server/`,
which is the only reason the duplication exists.

---

## Where uploads appear

| Surface | Component | Limit |
| ------- | --------- | ----- |
| Profile photo | `ImageUploader` in `/settings/account` | 1 image, square |
| Post media | `PostComposer` | 4 items, images + videos |
| Business photos | `BusinessSubmissionForm` | 1 cover, 1 logo, 8 gallery |
| Product images | `ProductEditorForm` | 5 images |

Post media is capped at four because that is exactly the set of grids
`PostMedia` can lay out (single, pair, trio with a lead, 2×2). A fifth would need
a "+N" overlay that does not exist. **A post containing any video drops the grid
entirely** — a 9:16 clip in a grid cell is a postage stamp.

### Stored shapes

```jsonc
posts.media       [{ "url": "https://…", "type": "image" }]
products.images   ["https://…", …]
businesses.photos { "cover": "https://…|null", "logo": …, "gallery": […] }
```

`businesses.photos` used to default to `'[]'`, so `readBusinessPhotos` and
`normalizeBusinessPhotos` accept the legacy bare array as well as the object.
Every URL is https-only on the way in and on the way out.

### Replacement deletes the old asset

Replacing an avatar deletes the previous Cloudinary file, after the row is
updated. `publicIdFromUrl` returns `null` for anything that is not one of our own
Cloudinary URLs, so an avatar from another provider is left alone. A delete
failure is logged, not thrown — the new photo is already saved.

Orphaned assets (a removed gallery image, a failed post) are **not** deleted
immediately. A cleanup job is the right home for that, not the request path.

---

## Video, and the missing size ceiling

**The direct path has no server-enforced byte limit.** This is the one real gap
Phase 5C.2 opens, and it is worth stating rather than discovering later.

Cloudinary's upload API has no per-request maximum-size parameter. `max_file_size`
looks plausible and is not real: it is absent from the SDK's TypeScript types,
from its JavaScript and from its docs. Verified, not assumed.

| Layer | Enforced? |
| ----- | --------- |
| `checkFileForUpload` in the client | Yes, for honest users |
| Cloudinary `allowed_formats` | Yes, signed, so the provider rejects a wrong type |
| The Cloudinary account's plan limit | Yes, at whatever the plan allows |
| **A NOlida server** | **No** |

The old path read the bytes and refused an oversize file. That is gone: a
signed-in user who ignores the client can push a large file into the account. It
burns quota rather than being a security hole, but it is not nothing.

Closing it, cheapest first:

1. Configure a **signed upload preset** in the Cloudinary dashboard with a
   maximum file size, then sign `upload_preset`. Operator setup, no code.
2. Verify at save time via the Admin API, where `cloudinary.api.resource(publicId)`
   returns `bytes` and `format`, and refuse a URL whose asset is too large. Costs
   one round trip per media item on publish.
3. Accept it and watch usage.

Option 1 for now; option 2 if abuse appears.

---

## The secureUrl rule (Phase 5C.1)

Cloudinary returns **two** URL fields for the same asset:

| field | value |
| ----- | ----- |
| `url` | `http://res.cloudinary.com/...` on many accounts |
| `secure_url` | always `https://` |

`/api/upload` returns both (`url`, `secureUrl`). **Store `secureUrl`.** Every
media schema is https-only, so reading the wrong field made a perfectly good
upload fail at Publish with "Media must be an https URL" — the Phase 5C.1 bug,
reported identically on posts, avatars, business photos and product images,
because they all read `uploaded.url`.

Three layers now stand between a provider `http://` and a user-visible error:

1. `cloudinary.adapter.ts` — `toSecure()` upgrades `secure_url ?? url`.
2. `lib/client/upload.ts` — `uploadMediaFile` resolves `url` **and** `secureUrl`
   as https, so a caller that reads either one is correct.
3. `ImageUploader` — uses `uploaded.secureUrl` explicitly.

A non-`http(s)` value is deliberately left alone by `toSecure`, so a
`javascript:` URL still fails loudly at the schema instead of being rewritten
into something that merely looks valid.

## Direct uploads (Phase 5C.2)

The browser posts the file **straight to Cloudinary**. Our server signs; it does
not carry.

```
browser ──tiny POST──▶ NOlida /api/upload/signature   (~50ms, no file)
browser ─────────────▶ api.cloudinary.com/.../upload  (the bytes)
```

One network hop instead of two, and no server memory holding a 50MB buffer. The
progress bar became a real 0–100: on the old path it had to stop at 90, because
the server's validation and the provider's storage were invisible to the client.

### The signature is the contract

Cloudinary **recomputes the signature from the fields it receives**. So every
signed field must be sent back, every sent field must have been signed, and
values must match exactly. Get it wrong and every upload fails with
`Invalid Signature` — not a warning, not a partial failure.

The response therefore carries `params`: the exact set that was signed. The
client iterates it rather than retyping field names, so adding a signed
parameter later cannot silently break the client.

```ts
// server — sign
const params = { timestamp, folder, allowed_formats };

// client — echo, do not retype
for (const [key, value] of Object.entries(sig.params)) form.append(key, value);
```

`allowed_formats` is signed, which means **Cloudinary enforces the allow-list**.
That is what replaces `sniffMimeType` on this path: an `.exe` renamed to `.jpg`
is refused by the provider. Do not remove it, and keep
`ALLOWED_IMAGE_EXTENSIONS` in step with `ALLOWED_IMAGE_TYPES`.

### What the client may choose

Only a `purpose` and a `resourceType`. The folder and the allow-list are derived
server-side from the purpose. A body-supplied folder would be an open write
anywhere in the Cloudinary account.

Every signature is rate limited (60/minute per user) and writes a
`UPLOAD_SIGNATURE_ISSUED` row to `security_events`. That audit row matters more
on this path than the old one: the bytes never pass through us, so it is the only
trace that a write was authorised. A failed audit write is logged, never allowed
to deny an upload.

### Cancellation and progress

Both upload surfaces hold an `AbortController`, so an in-flight upload can be
cancelled. A 50MB video on a slow connection should not be a commitment you
cannot back out of. The composer aborts every in-flight upload on unmount.

Progress callbacks are coalesced to roughly ten per second per file. Four
parallel uploads firing raw `progress` events would re-render the composer tens
of times a second and make typing in the textarea stutter.

Post media uploads in parallel. That was the wrong call while files went through
our own server, where each one was a two-hop request holding a buffer. Now the
only shared resource is the connection itself.

### `/api/upload` is still there

`/api/upload` remains for a proxy that blocks `api.cloudinary.com`, a content
blocker, or an old browser — and it is the last caller of `sniffMimeType`.

The client does **not** fall back to it automatically, which is deliberate. A
CORS-blocked response does not mean the upload failed: the browser blocks the
response while the bytes have usually already reached Cloudinary and been
stored. Retrying would re-send the whole file and orphan the first asset,
turning a working upload into a duplicated, half-visible one. An honest error
beats a silent retry.

## Security notes

- **Signed uploads only.** The API secret never reaches the browser.
- **Session required.** `/api/upload` returns 401 without one.
- **Rate limited** per user: 60/minute for signatures, 30/minute for the
  server-side fallback upload.
- **https-only URLs** everywhere a URL is rendered into `src` or `href`. A
  `javascript:` value in `posts.media`, `products.images`, `avatar_url` or
  `businesses.photos` would be a stored XSS on a page other people load. The
  service layer enforces it, not just the zod schema.
- **Hotlinking is allowed.** A user may reference any https URL. That is what
  every social platform does, and it is not a security hole.