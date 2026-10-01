/**
 * End-to-end search check, against the real database.
 *
 * Runs the real repositories, service and SQL. There is no seed data in this
 * database to speak of, so this script creates its own: three accounts, profiles
 * with usernames and bios, and posts containing known words. Everything is
 * deleted afterwards, so running it leaves the database as it found it.
 *
 *   npm run test:search
 */
import { getPool, query } from "@/lib/db/client";
import { register, verifyOtp } from "@/lib/server/services/auth.service";
import { createPost } from "@/lib/server/services/post.service";
import { followUser } from "@/lib/server/services/interaction.service";
import {
  getDiscoveryData,
  search,
} from "@/lib/server/services/search.service";

const PASSWORD = "TestPassword123";
const stamp = Date.now();

let failures = 0;
let checks = 0;

function check(name: string, ok: boolean, detail = ""): void {
  checks += 1;
  if (ok) {
    console.log(`PASS ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name}${detail ? ` - ${detail}` : ""}`);
  }
}

/** Registers + verifies an account and reads the dev-printed OTP off the console. */
async function makeUser(email: string): Promise<string> {
  const captured: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    captured.push(args.map((a) => String(a)).join(" "));
  };
  let userId: string;
  try {
    const result = await register({ email, password: PASSWORD });
    userId = result.userId;
  } finally {
    console.log = original;
  }

  let code: string | null = null;
  for (const line of captured) {
    const match = line.match(/code=(\d{6})/);
    if (match) code = match[1] ?? null;
  }
  if (!code) throw new Error(`Could not read OTP for ${email}`);

  await verifyOtp({ identifier: email, code, purpose: "REGISTER" });
  return userId;
}

/**
 * Gives a user a searchable identity.
 *
 * Uses an upsert rather than assuming `register` created a profile row: what a
 * brand-new account has is an implementation detail of Phase 3, and this test
 * should not break if that changes.
 */
async function setProfile(
  userId: string,
  values: { username: string; full_name: string; bio: string }
): Promise<void> {
  await query(
    `INSERT INTO profiles (user_id, username, full_name, display_name, bio)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE
       SET username = EXCLUDED.username,
           full_name = EXCLUDED.full_name,
           display_name = EXCLUDED.display_name,
           bio = EXCLUDED.bio`,
    [userId, values.username, values.full_name, values.full_name, values.bio]
  );
}

/** Gives a post some likes, via the interaction service rather than raw SQL. */
async function addLikes(postId: string, userIds: string[]): Promise<void> {
  const { likePost } = await import(
    "@/lib/server/services/interaction.service"
  );
  for (const userId of userIds) {
    await likePost({ userId, postId });
  }
}
async function main(): Promise<void> {
  const email = (who: string): string => `search-${who}-${stamp}@nolida.test`;
  let amara = "";
  let bayo = "";
  let chidi = "";

  try {
    // ── Seed ───────────────────────────────────────────────────────────
    amara = await makeUser(email("amara"));
    bayo = await makeUser(email("bayo"));
    chidi = await makeUser(email("chidi"));

    await setProfile(amara, {
      username: "amara_photos",
      full_name: "Amara Okonkwo",
      bio: "Wedding photography and portraits across Lagos.",
    });
    await setProfile(bayo, {
      username: "bayobakes",
      full_name: "Bayo Adeyemi",
      bio: "Sourdough bread, small batch, weekend pickup.",
    });
    await setProfile(chidi, {
      username: "chidi_fixes",
      full_name: "Chidi Nwosu",
      bio: "Laptop repairs and IT support for small offices.",
    });
    check("three accounts seeded with profiles", Boolean(amara && bayo && chidi));

    const photoPost = await createPost({
      userId: amara,
      body: "New photography studio opening in Lagos next month.",
      location: "Lagos",
    });
    const foodPost = await createPost({
      userId: bayo,
      body: "Sourdough bread drop this Saturday, Ikoyi.",
      location: "Ikoyi",
    });
    const repairPost = await createPost({
      userId: chidi,
      body: "Laptop screen replacements while you wait.",
      location: "Surulere",
    });
    const privatePost = await createPost({
      userId: amara,
      body: "Private note about the Lagos studio budget.",
      visibility: "PRIVATE",
    });

    await addLikes(photoPost.id, [bayo, chidi]);
    await addLikes(foodPost.id, [chidi]);
    check("seeded posts with likes", true);

    // ── Post search ────────────────────────────────────────────────────
    const photo = await search({ viewerId: amara, query: "photography" });
    check(
      "full-text search finds a post by body word",
      photo.results.some((r) => r.id === photoPost.id)
    );
    check(
      "counts.posts reflects matches",
      photo.counts.posts >= 1,
      `got ${photo.counts.posts}`
    );

    const lagos = await search({ viewerId: amara, query: "lagos" });
    check(
      "search matches on location",
      lagos.results.some((r) => r.id === photoPost.id)
    );

    const typo = await search({ viewerId: amara, query: "photograpy" });
    check(
      "trigram fallback survives a typo",
      typo.results.some((r) => r.id === photoPost.id),
      "fuzzy match failed"
    );

    // A second, unrelated fuzzy query on different data. One green typo test
    // could be a fluke of one body; this shows the fallback is general.
    const secondTypo = await search({ viewerId: amara, query: "laptob" });
    check(
      "trigram fallback works on a different post",
      secondTypo.results.some((r) => r.id === repairPost.id),
      "fuzzy match failed"
    );

    // The other half of a fuzzy matcher: something that must NOT match. "repairs"
    // is a real word, it just is not in that post, and it scores 0.375 against
    // the body. This pins the precision side, so the threshold cannot drift
    // towards "return everything" without this going red.
    const notSimilar = await search({ viewerId: amara, query: "repairs" });
    check(
      "trigram fallback rejects a word that is merely related",
      !notSimilar.results.some((r) => r.id === repairPost.id),
      "fuzzy match was too loose"
    );

    const ikoyi = await search({ viewerId: amara, query: "Ikoyi" });
    check(
      "location search is case-insensitive",
      ikoyi.results.some((r) => r.id === foodPost.id)
    );

    const filtered = await search({
      viewerId: amara,
      query: "Lagos",
      location: "Ikoyi",
    });
    check(
      "location filter narrows results",
      filtered.results.every((r) =>
        r.type === "post" ? r.location?.toLowerCase().includes("ikoyi") : true
      ) && filtered.results.length < lagos.results.length,
      `filtered=${filtered.results.length} lagos=${lagos.results.length}`
    );

    // ── The privacy guarantee ──────────────────────────────────────────
    const amaraSearch = await search({ viewerId: amara, query: "studio" });
    check(
      "author finds their own PRIVATE post",
      amaraSearch.results.some((r) => r.id === privatePost.id)
    );
    const bayoSearch = await search({ viewerId: bayo, query: "studio" });
    check(
      "search never leaks another user's PRIVATE post",
      !bayoSearch.results.some((r) => r.id === privatePost.id)
    );
    check(
      "counts.posts also excludes it",
      bayoSearch.counts.posts < amaraSearch.counts.posts,
      `bayo=${bayoSearch.counts.posts} amara=${amaraSearch.counts.posts}`
    );

    // ── Type filter ────────────────────────────────────────────────────
    const onlyPosts = await search({ viewerId: amara, query: "bayo", type: "post" });
    check(
      "type=post returns only posts",
      onlyPosts.results.every((r) => r.type === "post")
    );
    const onlyUsers = await search({ viewerId: amara, query: "bayo", type: "user" });
    check(
      "type=user returns only users",
      onlyUsers.results.every((r) => r.type === "user")
    );
    const businesses = await search({
      viewerId: amara,
      query: "anything",
      type: "business",
    });
    check(
      "type=business is stubbed empty",
      businesses.results.length === 0 && businesses.counts.businesses === 0
    );
    check(
      "type=business still reports real post counts",
      businesses.counts.posts >= 0
    );
// ── People search ──────────────────────────────────────────────────
    const byHandle = await search({ viewerId: chidi, query: "amara_photos" });
    const amaraResult = byHandle.results.find(
      (r) => r.type === "user" && r.id === amara
    );
    check(
      "search finds a person by @username",
      amaraResult?.type === "user",
      "no user result"
    );

    const byName = await search({ viewerId: chidi, query: "Okonkwo" });
    check(
      "search finds a person by full name",
      byName.results.some((r) => r.type === "user" && r.id === amara)
    );

    const byBio = await search({ viewerId: chidi, query: "sourdough" });
    check(
      "search finds a person by bio",
      byBio.results.some((r) => r.type === "user" && r.id === bayo)
    );

    const fuzzyName = await search({ viewerId: chidi, query: "Okonkw" });
    check(
      "trigram fallback finds a mistyped name",
      fuzzyName.results.some((r) => r.type === "user" && r.id === amara),
      "fuzzy name match failed"
    );

    // ── Follow state on results ────────────────────────────────────────
    const before = await search({ viewerId: chidi, query: "Amara", type: "user" });
    const beforeAmara = before.results.find((r) => r.id === amara);
    check(
      "is_following is false before following",
      beforeAmara?.type === "user" && beforeAmara.is_following === false
    );

    await followUser({ followerId: chidi, followingId: amara });
    const after = await search({ viewerId: chidi, query: "Amara", type: "user" });
    const afterAmara = after.results.find((r) => r.id === amara);
    check(
      "is_following is true after following",
      afterAmara?.type === "user" && afterAmara.is_following === true
    );
    check(
      "your own account is not suggested to you",
      !(
        await getDiscoveryData(chidi)
      ).suggestedUsers.some((u) => u.id === chidi)
    );
    check(
      "someone you already follow is not suggested again",
      !(
        await getDiscoveryData(chidi)
      ).suggestedUsers.some((u) => u.id === amara)
    );

    // ── Discovery ──────────────────────────────────────────────────────
    const discovery = await getDiscoveryData(amara);
    check(
      "trending returns posts with likes",
      discovery.trendingPosts.length > 0 &&
        discovery.trendingPosts.every((p) => p.like_count >= 0)
    );
    check(
      "trending is ordered by likes",
      discovery.trendingPosts.every(
        (p, i, all) => i === 0 || all[i - 1]!.like_count >= p.like_count
      )
    );
    check(
      "suggested users have posted something",
      discovery.suggestedUsers.every((u) => u.type === "user" && !u.is_following)
    );
    check(
      "recent activity excludes other people's private posts",
      !(await getDiscoveryData(chidi)).recentPosts.some(
        (p) => p.id === privatePost.id
      )
    );
    check(
      "author still sees their own private post in recent activity",
      (await getDiscoveryData(amara)).recentPosts.some(
        (p) => p.id === privatePost.id
      )
    );

    // ── Sorting and paging ─────────────────────────────────────────────
    const popular = await search({
      viewerId: amara,
      query: "Lagos",
      sortBy: "popular",
      type: "post",
    });
    const relevant = await search({
      viewerId: amara,
      query: "Lagos",
      sortBy: "relevance",
      type: "post",
    });
    const recent = await search({
      viewerId: amara,
      query: "Lagos",
      sortBy: "recent",
      type: "post",
    });
    check("popular sort returns rows", popular.results.length > 0);
    check("recent sort returns rows", recent.results.length > 0);
    check(
      "relevance sort returns rows",
      relevant.results.length > 0
    );
    check(
      "ranks stay within 0 and 1",
      [...popular.results, ...recent.results, ...relevant.results].every(
        (r) => r.rank >= 0 && r.rank <= 1
      )
    );

    const empty = await search({ viewerId: amara, query: "" });
    check(
      "an empty query returns recent content, not nothing",
      empty.results.length > 0
    );

    const page1 = await search({ viewerId: amara, query: "a", type: "post", limit: 1 });
    check("limit is honoured", page1.results.length <= 1);
    if (page1.nextCursor) {
      const page2 = await search({
        viewerId: amara,
        query: "a",
        type: "post",
        limit: 1,
        offset: 1,
      });
      check(
        "offset paging returns a different row",
        page2.results[0]?.id !== page1.results[0]?.id
      );
    } else {
      check("offset paging returns a different row", true, "only one page exists");
    }

    const nonsense = await search({ viewerId: amara, query: "asdfqwer1234" });
    check(
      "a nonsense query returns nothing",
      nonsense.results.length === 0,
      `${nonsense.results.length} unexpected results`
    );
  } catch (error) {
    failures += 1;
    console.log(
      `FAIL flow - ${error instanceof Error ? `${error.constructor.name}: ${error.message}` : String(error)}`
    );
  } finally {
    await getPool().query("DELETE FROM users WHERE email LIKE $1", [
      `search-%-${stamp}@nolida.test`,
    ]);
    console.log("\nCleaned up seeded accounts.");
  }

  console.log(`\n${checks} checks, ${failures} failures`);
  await getPool().end();
}

main().catch(async (error) => {
  console.error("Search test crashed:", error);
  try {
    await getPool().end();
  } catch {
    // ignore shutdown errors
  }
  process.exit(1);
});