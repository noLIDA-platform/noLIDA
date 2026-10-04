# Media & Uploads (Phase 5C)

Photos and videos across noLIDA. Files live at Cloudinary; **noLIDA stores only
URLs**. No file is ever written to the server filesystem or into Postgres.

---

## Cloudinary setup

Three env vars, in `.env.local` locally and in Vercel for production:

```
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

The secret never reaches the browser. Uploads are **signed**: the file travels
through our own `/api/upload`, the session is checked there, the bytes are
validated there, and only then does the server call Cloudinary with its
credentials. There is no unsigned upload preset and no `next-cloudinary` — a
widget with an unsigned preset would let anyone with a browser upload to your
account without a session.

If the vars are missing, `/api/upload` returns `500 STORAGE_NOT_CONFIGURED` and
logs it server-side. The user sees "Photo uploads are not available right now."

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

## Video, and why 50 MB

`maxDuration = 60` on the route. Files are held in memory as a Buffer, so 50 MB is
the real ceiling — the limit is checked *before* the read, and again in the
adapter.

The escape hatch for larger files is a **signed direct-to-Cloudinary upload**
(`generateAuthToken` + an upload preset), which keeps bytes off this server
entirely. That is a replacement for the architecture, not the next increment of
the number. At this scale the buffered path is fine.

---

## Security notes

- **Signed uploads only.** The API secret never reaches the browser.
- **Session required.** `/api/upload` returns 401 without one.
- **Rate limited** per user: 30/minute.
- **https-only URLs** everywhere a URL is rendered into `src` or `href`. A
  `javascript:` value in `posts.media`, `products.images`, `avatar_url` or
  `businesses.photos` would be a stored XSS on a page other people load. The
  service layer enforces it, not just the zod schema.
- **Hotlinking is allowed.** A user may reference any https URL. That is what
  every social platform does, and it is not a security hole.