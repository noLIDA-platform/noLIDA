# NOlida Codbase Reference

`C:\dev\nolida` is the git root (`noLIDA-platform/noLIDA.git`). All paths below are absolute under that root.

> **Rule 0** — before writing any new page, component or API route: read this file first. Copy the closest working file as a template. Only use imports listed here. Never invent paths, prop names, helper functions or packages.

---

## 1. Session reading

The correct pattern for reading the current user in a **Server Component** is the one used by the working `/requests` page:

```ts
import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/server/auth/current-user";

export const dynamic = "force-dynamic";

export default async function RequestsPage({ searchParams }) {
  const session = await getCurrentSessionUser();
  if (!session) redirect("/");
  // session.user.id is the only identity value the page may use
}
```

Rules:

- Server Components and layouts read the session via `getCurrentSessionUser()` from `src/lib/server/auth/current-user.ts`. That helper internally calls `readSessionToken()` -> `cookies().get("nolida_session")`.
- Route Handlers receive a NextRequest, so they use `readSessionCookie(request)` from `src/lib/server/auth/session-cookie.ts` instead. `readSessionToken()` is for Server Components only.
- `/` sends a signed-in visitor to `/home`. The session guard is a `redirect()`; never move it into individual pages.
- Both `readSessionCookie` and `readSessionToken` live in `src/lib/server/auth/session-cookie.ts` (cookie name is the private constant `COOKIE_NAME = "nolida_session"`).

---

## 2. Installed packages

Only these are installed (from `package.json`). Never import from a package not listed below.

| Runtime dependencies | | | |
|---|---|---|---|
| @supabase/supabase-js | ^2.117.2 | lucide-react | ^1.48.0 |
| bcryptjs | ^3.0.3 | next | 16.3.6 |
| cloudinary | ^2.11.0 | pg | ^8.23.0 |


## 3. UI components

Every component lives in `src/components/ui/`. Each component's props are defined in its own `.tsx` file. Always read the file before using a component — do NOT invent props like `as="link"` or `action={...}` unless the component actually accepts them.

| Component & file | Props | Notes |
|---|---|---|
| `Button` — `src/components/ui/Button/Button.tsx` | `ButtonProps` (variant, size, disabled, type, className) | Check the file for exact variant names |
| `Input` — `src/components/ui/Input/Input.tsx` | `InputProps` | Text input |
| `Textarea` — `src/components/ui/Textarea/Textarea.tsx` | `TextareaProps` | Textarea |
| `PasswordInput` — `src/components/ui/PasswordInput/PasswordInput.tsx` | `PasswordInputProps` | Omit `type`; never render `<Input type="password" />` directly |
| `Link` — `src/components/ui/Link/Link.tsx` | `LinkProps` | Client-side navigation wrapper; use `next/link` literally for plain `<Link>` |
| `EmptyState` — `src/components/ui/EmptyState/EmptyState.tsx` | `EmptyStateProps` (icon, title, description, action) | Use for the empty list state |
| `Icon` — `src/components/ui/Icon/Icon.tsx` | `IconProps` (`as`, `size`, className) | Renders a lucide icon by name; only icons in the barrel are safe |
| `Spinner` — `src/components/ui/Spinner/Spinner.tsx` | `SpinnerProps` (size) | Reuse for loading states; `type SpinnerSize` |
| `Badge` — `src/components/ui/Badge/Badge.tsx` | `BadgeProps` (variant, className) | Never show badges with zero counts |
| `Card` — `src/components/ui/Card/Card.tsx` | `CardProps` (variant: "default" | "elevated", as, children, className, style) | as accepts "div" | "article" | "section" | "aside" | "main" |
| `Avatar` — `src/components/ui/Avatar/Avatar.tsx` | `AvatarProps` (src, name, size, className) | initialsOf from @/lib/client/shell-user is imported internally |
| `Container` — `src/components/ui/Container/Container.tsx` | `ContainerProps` (size: "sm" | "md" | "lg" | "full", children, className) | |
| `ImageUploader` — `src/components/ui/ImageUploader/ImageUploader.tsx` | `ImageUploaderProps` (value, onChange, kind, purpose, aspect, maxSizeMB, label, className) | "use client"; owns the upload; onChange fires when file is stored |
| `SensitiveValue` — `src/components/ui/SensitiveValue/SensitiveValue.tsx` | `SensitiveValueProps` (value, format, revealed, onToggle, hiddenText, label, className) | Hidden by default; eye toggle is type="button" |
| `WhatsAppButton` — `src/components/ui/WhatsAppButton/WhatsAppButton.tsx` | `WhatsAppButtonProps` (message, label, className, inverse, size) | Round icon-only button; uses buildWhatsAppHref |
| `WhatsAppIcon` — `src/components/ui/WhatsAppButton/WhatsAppIcon.tsx` | `WhatsAppIconProps` (size) | Small SVG icon |
| `Alert` — `src/components/ui/Alert/Alert.tsx` | `AlertProps` (variant: "error" | "success" | "info", children, role, className) | Server Component |
| `PageLoader` — `src/components/ui/PageLoader/PageLoader.tsx` | `PageLoaderProps` (label, size, className) | Shared loading.tsx body; reuses Spinner |
| `ListItem` — `src/components/ui/ListItem/ListItem.tsx` | `ListItemProps` | Check the file for exact props |
| `List` — `src/components/ui/List/List.tsx` | `ListProps` | Check the file for exact props |
| `CheckBox` — `src/components/ui/CheckBox/CheckBox.tsx` | `CheckBoxProps` | Check the file for exact props |
| `Switch` — `src/components/ui/Switch/Switch.tsx` | `SwitchProps` | Check the file for exact props |
| `Table` — `src/components/ui/Table/Table.tsx` | `TableProps` | Check the file for exact props |
| `Pagination` — `src/components/ui/Pagination/Pagination.tsx` | `PaginationProps` | Check the file for exact props |
| `Dialog` — `src/components/ui/Dialog/Dialog.tsx` | `DialogProps` | Check the file for exact props |
| `Tab` — `src/components/ui/Tab/Tab.tsx` | `TabProps` | Check the file for exact props |
| `Tabs` — `src/components/ui/Tabs/Tabs.tsx` | `TabsProps` | Check the file for exact props |
| `ButtonGroup` — `src/components/ui/ButtonGroup/ButtonGroup.tsx` | `ButtonGroupProps` | Check the file for exact props |

---

## 4. Icons

Icons live in `src/components/ui/Icons/`. The single source of truth is the barrel file `src/components/ui/Icons/index.ts`, which re-exports stable names from lucide-react.

```ts
export {
  Bell as BellIcon,
  Bookmark as BookmarkIcon,
  Check as CheckIcon,
  Handshake as RequestIcon,
  Heart as HeartIcon,
  Home as HomeIcon,
  LifeBuoy as AlertIcon,
  LogOut as LogoutIcon,
  MessageCircle as MessageIcon,
  CirclePlus as PlusCircleIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  Share2 as ShareIcon,
  ShoppingCart as CartIcon,
  Store as StoreIcon,
  User as UserIcon,
  Wallet as WalletIcon,
} from "lucide-react";

// Messaging (Phase 10)
export {
  Archive as ArchiveIcon,
  ArrowLeft as ArrowLeftIcon,
  Ban as BanIcon,
  BellOff as BellOffIcon,
  CheckCheck as CheckCheckIcon,
  ChevronLeft as ChevronLeftIcon,
  Copy as CopyIcon,
  CornerUpLeft as CornerUpLeftIcon,
  EllipsisVertical as MoreVerticalIcon,
  FileText as FileTextIcon,
  Flag as FlagIcon,
  Image as ImageIcon,
  Mic as MicIcon,
  Pause as PauseIcon,
  Pin as PinIcon,
  Play as PlayIcon,
  Plus as PlusIcon,
  Send as SendIcon,
  Smile as SmileIcon,
  Square as StopIcon,


## 5. Services and their exports

Services live in `src/lib/server/services/`. All business logic goes here.

| Service & file | Exported functions |
|---|---|
| `authorizationCodes.service.ts` | createAuthorizationCode, getActiveCodesForBusiness, getCodeByToken, consumeCode, validateCode, revokeCode, countByBusiness |
| `auth.service.ts` | getSessionUser, getCurrentUser, createUser, updateUser, deleteUser, findUserByEmail, findUserByPhone, findUserByOtp, createOtpRecord, getOtpRecord, updateOtpRecord, deleteOtpRecord, verifyOtp, hashOtpToken, verifyPassword, hashPassword, createSession, getSession, revokeSession, revokeAllUserSessions, getActiveSessionCount, getSessionUser, getCurrentSessionUser, findActiveByTokenHash, loginWithPassword, loginWithOtp, registerEmail, registerPhone, logout, forgotPassword, resetPassword, checkPasswordResetEligibility, bindPhone, verifyPhone, createVerifyToken, consumeVerifyToken, getUnverifiedContactByToken, sendVerificationEmail, resendVerificationEmail, isVerifiedEmail, isVerifiedPhone, getUnverifiedContact |
| `catalog.service.ts` | createService, updateService, deleteService, getService, listServicesByBusiness, countServicesByBusiness, createProduct, updateProduct, deleteProduct, getProduct, listProductsByBusiness, countProductsByBusiness |
| `email.service.ts` | sendOtpEmail, sendResetEmail, sendVerificationEmail, sendBulkOtpEmails, sendInvitationEmail, getOtpPurpose |
| `feed.service.ts` | getHomeFeed, getUserPosts, getSavedPosts, getPostForViewer, countPostsByUser, countSavedPosts, countPostedPosts, countTaggedPosts |
| `interaction.service.ts` | likePost, unlikePost, commentOnPost, deleteComment, likeComment, unlikeComment, sharePost, savePost, unsavePost, followUser, unfollowUser |
| `messaging.service.ts` | mapMessage, listConversations, startConversation, getConversation, updateConversationSettings, listMessages, searchMessages, sendMessage, editMessage, deleteMessage, addReaction, removeReaction, forwardMessage, markConversationRead, setTyping, reportMessage, blockUser, unblockUser |
| `post.service.ts` | createPost, updatePost, deletePost |
| `profile.service.ts` | getOwnProfile, updateOwnProfile, getProfileData, getProfileByUsername, getProfileForViewer, getProfilePhotos |
| `publicBusiness.service.ts` | getBySlug, listByCategory, listFeatured, countByCategory, getBusinessStats, profileTasks, profileCompletionPercent, getOwnerDashboardStats |
| `request.service.ts` | createRequest, getRequest, listResponses, createResponse, acceptResponse, declineResponse, withdrawResponse, cancelRequest, countByUser, countOpenByUser, countClosedByUser, updateRequest |
| `search.service.ts` | searchPosts, searchBusinesses, searchType, searchUser, searchCounts |
| `security.service.ts` | recordSecurityEvent, getSecurityEvents, listAllSecurityEvents |
| `session.service.ts` | createSession, getSession, revokeSession, revokeAllUserSessions, getActiveSessionCount, getCurrentUser, getSessionUser, findActiveByTokenHash |
| `users.service.ts` | createUser, updateUser, deleteUser, findUserByEmail, findUserByPhone, findUserByOtp, getUsersWhere, getValidUser, checkUserByEmail, checkUserByPhone, checkUserByOtp |
| `wallet.service.ts` | getWallet, createWallet, getEarnings, createEarnings, settleFunds, createWalletTransaction, getWalletTransaction, listWalletTransactions, getWalletBalance |

Note: `getCurrentSessionUser` lives in `src/lib/server/auth/current-user.ts` (not in a service file). It is the Server Component pattern for reading the current user.

---

## 6. Repositories and their exports

Repositories live in `src/lib/server/repositories/`. All SQL goes here. Only pg is used.

| Repository & file | Exported functions |

| `post.repo.ts` | create, update, delete, getById, getBySlug, getByUser, listPublic, search, getImages, getVideos, getMedia, countByUser, countByPost, countPublic, countSaved, countSavedByPost, getSavedByUser, getLikedByUser, countLikedByPost, countCommentByPost, countTaggedByUser |
| `product.repo.ts` | create, update, softDelete, getById, getBySlug, getByBusiness, listByBusiness, countByBusiness |
| `service.repo.ts` | create, update, softDelete, getById, getBySlug, getByBusiness, listByBusiness, countByBusiness |
| `tag.repo.ts` | create, update, delete, getById, getBySlug, listAll, listByPost |
| `user.repo.ts` | create, update, softDelete, getById, getByEmail, getByPhone, getByUsername, getByOtp, listPublicUsers, search, searchTyped, getPublicUser, countBySlug |
| `verification.repo.ts` | createRecord, getRecord, updateRecord, deleteRecord, getByToken, getByContact, consumeToken, isValid |
| `whatsapp.repo.ts` | create, getByPhone, listByUser, updateSettings, delete |

Note: the repositories for the visibility predicate live in `src/lib/server/repositories/visibility.ts` (not listed here — it exports `VISIBLE_TO_VIEWER`).

---

## 7. Client-side helpers

Client helpers live in `src/lib/client/`. Client Components may import from here — but never from `src/lib/server/`.

| File | Exports |
|---|---|
| `src/lib/client/api.ts` | apiFetch (async fetch wrapper for API routes; handles errors; used by all auth forms). Also re-exports type UploadPurposeName, UploadKind, checkFileForUpload, clientMaxLabel, formatUploadSpeed, uploadDirect, type UploadParams, type SignatureParams |
| `src/lib/client/upload.ts` | uploadDirect (direct-to-Cloudinary upload using signed signatures; fires onprogress), checkFileForUpload, clientMaxLabel, formatUploadSpeed, type UploadKind, type UploadPurposeName, type UploadParams, type SignatureParams |
| `src/lib/client/shell-user.ts` | initialsOf (derives initials from a name string; used by Avatar for fallback initials) |
| `src/lib/client/use-api.ts` | useApi (optional React hook for calling API routes from client components — exists in the codebase) |
| `src/lib/client/use-token.ts` | Optional token hook (if present in the codebase) |

Rules:

- `src/lib/client/api.ts` exports apiFetch — the only HTTP client Client Components should use for API calls. Never use the raw fetch for API calls.
- uploadDirect from src/lib/client/upload.ts is the only way to upload files to Cloudinary on the direct path (Phase 5C.2). It uses XMLHttpRequest and returns { url, secureUrl }.
- checkFileForUpload and clientMaxLabel are server-side validation rules re-implemented client-side for the file picker — they exist as a courtesy copy; the real validation is always on the server.

---

## 8. Existing pages (working examples to copy from)

These pages work. Use them as templates when building a new page.

| Page | What it shows |
|---|---|
| `src/app/(main)/requests/page.tsx` | List page with tabs + filters; session guard via `getCurrentSessionUser()` + `redirect("/")`; uses `getHomeFeed`, `getSavedPosts`, `getRequestAll`, `getPostForViewer` from `feed.service`; paginated with `(created_at, id)` cursor |
| `src/app/(main)/requests/[id]/page.tsx` | Detail page with params; `params` typed as `Promise<{ id: string }>`; `getRequest`, `listResponses` from `request.service`; uses `EmptyState`, `Icon`, `Link` from UI primitives; shows `notFound()` for unknown posts |
| `src/app/(main)/my-business/page.tsx` | Dashboard-style page; `getCurrentSessionUser`; checks business status and redirects accordingly (`/my-business/pending` for non-APPROVED, `/my-business/submit` for DRAFT/CHANGES_REQUESTED) |
| `src/app/(main)/messages/page.tsx` | Messages list page; `getCurrentSessionUser`; `listConversations` from `messaging.service`; shows empty state when no conversations |
| `src/app/(main)/messages/[id]/page.tsx` | Conversation detail; `getConversation`; `MessageComposer`, `MessageList`, `ChatHeader` from `components/messaging` |
| `src/app/(main)/search/page.tsx` | Search page with debounced input; uses `search.service` (`searchPosts`, `searchBusinesses`); paginates with offset |

Notes:

- Route Handlers (e.g. `src/app/api/…/route.ts`) use `readSessionCookie(request)` from `src/lib/server/auth/session-cookie.ts`, NOT `getCurrentSessionUser()`.
- Every page under `(main)` is `dynamic = "force-dynamic"` and starts with the session guard.
- Every list paginates. `limit + 1` rows are fetched; the extra row is what makes `nextCursor` honest.
- Every API returns `{ ok: true, data }` or `{ ok: false, error }`.
- Every API endpoint that performs a financial mutation requires an `Idempotency-Key` header.

---

## 9. Golden rules

1. Before writing ANY import, check `docs/CODEBASE-REFERENCE.md` first.
2. If an import isn't listed in this file, it doesn't exist — do not use it.
3. If you need something that doesn't exist, STOP and tell the user.
4. Copy the closest working page as a template.
5. Read the actual component file before using its props.
6. Never invent: import paths, prop names, helper functions, or packages.
7. Run `npm run build` before committing and pushing — fixes all import errors.
|---|---|
| `authorizationCodes.repo.ts` | create, getActiveCodesForBusiness, getCodeByToken, consumeCode, validateCode, revokeCode, countByBusiness, countExisting |
| `auth.repo.ts` | createUser, updateUser, deleteUser, findUserByEmail, findUserByPhone, findUserByOtp, createOtpRecord, getOtpRecord, updateOtpRecord, deleteOtpRecord, verifyOtp, getSession, createSession, revokeSession, revokeAllUserSessions, getActiveSessionCount, findActiveByTokenHash |
| `business.repo.ts` | create, update, softDelete, getById, getBySlug, getByUser, listApprovedForCategory, listFeatured, countByCategory, getOwnerDashboardStats, listByBusiness |
| `categories.repo.ts` | create, update, delete, getById, getBySlug, listAll, countBySlug, getGlobalCount |
| `conversations.repo.ts` | create, update, getById, getByUserId, countByUserId, listByUser |
| `messages.repo.ts` | create, update, delete, getById, getByConversation, listByConversation, countByConversation, search, addReaction, removeReaction, forward, getConversationStats |
| `order.repo.ts` | create, update, softDelete, getById, getByBusiness, getByUser, countByBusiness, countByUser |
| `payments.repo.ts` | create, getById, listByBusiness, listByUser, countByStatus, createTransaction, getTransaction, listTransactions, getBalance |
  Trash2 as Trash2Icon,
  X as XIcon,
} from "lucide-react";
```

Rules:

- ALWAYS import icons from `@/components/ui/Icons` (the barrel), NEVER from lucide-react directly in new code.
- `src/components/ui/Icons/ConversationList/ConversationList.tsx` demonstrates the pattern: import named icons, then use `<Icon as={IconName} size={size} />`.
- Do NOT invent icon names. If an icon is missing, either use an inline SVG in the component or tell the user the icon is missing and ask what to do.
- `src/components/ui/Icon/Icon.tsx` is a wrapper accepting `as` (an icon component), `size`, `className`.
| react | 19.2.8 | react-dom | 19.2.8 |
| resend | ^6.30.0 | zod | ^4.6.5 |

| Dev dependencies | | | |
|---|---|---|---|
| @types/bcryptjs | ^2.4.6 | eslint | ^9 |
| @types/node | ^20 | eslint-config-next | 16.3.6 |
| @types/pg | ^8.23.1 | sharp | ^0.35.5 |
| @types/react | ^19 | tsx | ^4.23.15 |
| @types/react-dom | ^19 | typescript | ^5 |
| babel-plugin-react-compiler | ^1.0.0 | | |

Rules:

- Only import from packages listed above. Never add a new dependency without approval.
- `lucide-react` IS installed and is the underlying icon source. The approved, brand-safe path for icons is the local barrel `src/components/ui/Icons/index.ts`. Prefer that barrel over a direct lucide-react import in new code.
- Never import from @heroicons, @radix-ui, react-icons, or any package not listed above.