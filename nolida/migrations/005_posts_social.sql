CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- No FK yet: there is no `businesses` table. The column is reserved so posts
  -- do not need a rewrite when the business phase lands.
  business_id UUID,
  type TEXT NOT NULL DEFAULT 'GENERAL_POST',
  body TEXT NOT NULL,
  location TEXT,
  -- No FK yet: there is no `categories` table (discovery phase).
  category_id UUID,
  media JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'PUBLIC',
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT posts_body_length CHECK (char_length(body) BETWEEN 1 AND 5000),
  CONSTRAINT posts_type_valid CHECK (type IN (
    'GENERAL_POST', 'BUSINESS_POST', 'SERVICE_POST', 'PRODUCT_POST',
    'REQUEST_POST', 'OFFER_POST', 'AVAILABILITY_POST',
    'JOB_REQUEST_POST', 'ANNOUNCEMENT_POST', 'RECOMMENDATION_POST'
  )),
  CONSTRAINT posts_visibility_valid CHECK (visibility IN (
    'PUBLIC', 'FOLLOWERS', 'PRIVATE'
  ))
);

CREATE INDEX posts_user_idx ON posts (user_id, created_at DESC);
-- Compound so the (created_at, id) cursor is served by the index, matching the
-- row-value comparison the feed uses for pagination.
CREATE INDEX posts_created_idx ON posts (created_at DESC, id DESC);
CREATE INDEX posts_visibility_idx ON posts (visibility, created_at DESC);

CREATE TRIGGER posts_set_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX post_likes_post_idx ON post_likes (post_id);
CREATE INDEX post_likes_user_idx ON post_likes (user_id);

CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT comments_body_length CHECK (char_length(body) BETWEEN 1 AND 2000)
);

CREATE INDEX post_comments_post_idx ON post_comments (post_id, created_at);
CREATE INDEX post_comments_user_idx ON post_comments (user_id);

CREATE TRIGGER post_comments_set_updated_at
  BEFORE UPDATE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, user_id)
);

CREATE TABLE post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- NOT NULL on purpose. A nullable `channel` would defeat the UNIQUE below:
  -- Postgres treats NULLs as distinct, so two channel-less shares would both be
  -- inserted and `share_count` could be inflated by one person tapping twice.
  channel TEXT NOT NULL DEFAULT 'COPY_LINK',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT post_shares_channel_valid CHECK (channel IN (
    'COPY_LINK', 'WHATSAPP', 'CONVERSATION'
  )),
  UNIQUE (post_id, user_id, channel)
);

CREATE INDEX post_shares_post_idx ON post_shares (post_id);

CREATE TABLE saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX saved_posts_user_idx ON saved_posts (user_id, created_at DESC);

CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX follows_follower_idx ON follows (follower_id);
CREATE INDEX follows_following_idx ON follows (following_id);