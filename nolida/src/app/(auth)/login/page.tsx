import { redirect } from "next/navigation";

/**
 * `/login` is kept as a redirect rather than a second page.
 *
 * `/` is the sign-in screen, and every existing link across the marketing
 * site still points at `/login`. One page, two URLs — nothing to keep in sync.
 */
export default function LoginRedirectPage() {
  redirect("/");
}
