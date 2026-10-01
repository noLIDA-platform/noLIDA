import React from "react";

/**
 * Turns plain post text into React nodes with real links and hashtags.
 *
 * Written with `createElement` rather than JSX so this stays a `.ts` module —
 * it is a text utility, not a component, and nothing here returns markup the
 * caller has to reason about.
 *
 * Deliberately *not* `dangerouslySetInnerHTML`. The text is user input and is
 * never parsed as HTML: it is split into tokens and each token becomes either a
 * string (rendered as text, so `<script>` stays visible as those exact
 * characters) or an element we constructed. There is nothing to sanitise
 * because nothing is ever interpreted.
 */

/**
 * One pass, two kinds of token: a URL, or a `#hashtag`.
 *
 * `https?://` and `www.` cover the links people actually paste. The hashtag
 * rule is letters, digits and underscore, which is what a hashtag can be — a
 * trailing punctuation mark stays outside the tag rather than swallowing it.
 */
const TOKEN_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+|#[A-Za-z0-9_]+)/g;

/** Trailing punctuation commonly pasted after a link is not part of the link. */
function trimTrailingPunctuation(value: string): {
  core: string;
  trailing: string;
} {
  const match = value.match(/[.,!?;:)\]}'"]+$/);
  if (!match) return { core: value, trailing: "" };

  return {
    core: value.slice(0, value.length - match[0].length),
    trailing: match[0],
  };
}

function renderToken(token: string, key: string): React.ReactNode {
  if (token.startsWith("#")) {
    return React.createElement(
      "span",
      { key, className: "feed-hashtag" },
      token
    );
  }

  const { core, trailing } = trimTrailingPunctuation(token);
  const href = core.startsWith("http") ? core : `https://${core}`;

  return React.createElement(
    React.Fragment,
    { key },
    React.createElement(
      "a",
      {
        href,
        className: "feed-link",
        target: "_blank",
        // `noopener` is the security half (no window.opener handle),
        // `noreferrer` the privacy half, and `nofollow` keeps user-posted links
        // from reading as an endorsement to search engines.
        rel: "noopener noreferrer nofollow",
      },
      core
    ),
    trailing
  );
}

export function linkifyText(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let index = 0;

  TOKEN_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    nodes.push(renderToken(match[0], `token-${index}`));
    lastIndex = match.index + match[0].length;
    index += 1;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}