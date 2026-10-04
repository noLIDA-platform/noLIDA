"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Input } from "@/components/ui/Input/Input";
import { Avatar } from "@/components/ui/Avatar/Avatar";
import { ImageUploader } from "@/components/ui/ImageUploader/ImageUploader";
import { apiFetch } from "@/lib/client/api";
import type { Profile } from "@/lib/server/repositories/types";
import "./account.css";

export interface AccountSettingsProps {
  profile: Profile;
}

/**
 * Account settings: photo, name, username, bio.
 *
 * The avatar saves IMMEDIATELY on change and the text fields save on the button.
 * That split is deliberate: a photo is one discrete, obvious act — hunting for a
 * Save button to apply it feels broken — whereas a form of text is expected to
 * behave like a form.
 *
 * A Client Component, not because the session demands it (the `(main)` layout
 * already guards this route) but because uploading is interaction. The profile is
 * passed in from the Server Component parent, so there is no client fetch of data
 * the server already had.
 */
export function AccountSettings({ profile }: AccountSettingsProps): React.JSX.Element {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");

  const [saving, setSaving] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const previewName =
    fullName.trim() || displayName.trim() || username.trim() || null;

  /**
   * Persist the photo the moment the uploader hands us a URL.
   *
   * The uploader has ALREADY stored the asset by this point, so all that is left
   * is pointing the profile row at it. On failure the preview rolls back to the
   * last known-good value: showing a photo the server has not accepted would be a
   * lie that survives a refresh.
   *
   * The old asset is deleted server-side by `updateOwnProfile`, but only when the
   * new URL is one of our own Cloudinary assets — an avatar from another provider
   * is left alone rather than deleted out from under the row.
   */
  const handleAvatarChange = async (url: string | null): Promise<void> => {
    const previous = avatarUrl;
    setAvatarUrl(url);
    setError(null);
    setNotice(null);
    setSavingPhoto(true);

    const result = await apiFetch<{ profile: Profile }>("/api/profiles/me", {
      method: "PATCH",
      body: { avatar_url: url },
    });

    setSavingPhoto(false);

    if (!result.ok) {
      setAvatarUrl(previous);
      setError(result.error.message);
      return;
    }

    setNotice(url ? "Profile photo updated." : "Profile photo removed.");
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);

    const result = await apiFetch<{ profile: Profile }>("/api/profiles/me", {
      method: "PATCH",
      body: {
        full_name: fullName.trim() || null,
        display_name: displayName.trim() || null,
        username: username.trim() || null,
        bio: bio.trim() || null,
      },
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setNotice("Account details saved.");
  };

  return (
    <div className="account-settings">
      <h1 className="account-settings__title">Account</h1>

      <Card as="section" className="account-settings__card">
        <h2 className="account-settings__heading">Profile photo</h2>

        <div className="account-settings__photo">
          <Avatar src={avatarUrl} name={previewName} size="xl" />
          <div className="account-settings__photo-field">
            <ImageUploader
              value={avatarUrl}
              onChange={(url) => void handleAvatarChange(url)}
              kind="image"
              purpose="avatar"
              aspect="square"
              maxSizeMB={5}
              label="Profile photo"
            />
            <p className="account-settings__photo-note">
              {savingPhoto
                ? "Saving your photo…"
                : "Your photo saves as soon as you choose one."}
            </p>
          </div>
        </div>
      </Card>

      <Card as="section" className="account-settings__card">
        <h2 className="account-settings__heading">Details</h2>

        <form className="account-settings__form" onSubmit={handleSave}>
          <div className="account-settings__row">
            <Avatar src={avatarUrl} name={previewName} size="lg" />
            <Input
              id="account-display-name"
              label="Display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={80}
              placeholder="How your name appears on NOlida"
            />
          </div>

          <Input
            id="account-full-name"
            label="Full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            maxLength={120}
            placeholder="Your real name"
          />

          <Input
            id="account-username"
            label="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            maxLength={32}
            placeholder="lowercase, numbers and underscores"
          />

          <label className="account-settings__label" htmlFor="account-bio">
            Bio
            <textarea
              id="account-bio"
              className="account-settings__textarea"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Tell people what you do."
            />
          </label>

          {error ? (
            <p className="account-settings__error" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="account-settings__notice" role="status">
              {notice}
            </p>
          ) : null}

          <div className="account-settings__actions">
            <Button type="submit" loading={saving} disabled={savingPhoto}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}