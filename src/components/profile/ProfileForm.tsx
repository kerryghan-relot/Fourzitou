"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Camera, X } from "lucide-react";
import { updateProfileAction, updateAvatarAction, removeAvatarAction } from "@/server/actions/users";
import { getInitials } from "@/lib/utils";

type Props = {
  user: {
    displayName: string;
    email: string;
    avatarPath: string | null;
    locale: string;
  };
};

export function ProfileForm({ user }: Props) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const ts = useTranslations("settings");
  const router = useRouter();

  const [displayName, setDisplayName] = useState(user.displayName);
  const [locale, setLocale] = useState(user.locale);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileOk, setProfileOk] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isPendingProfile, startProfile] = useTransition();
  const [isPendingAvatar, startAvatar] = useTransition();

  const fileRef = useRef<HTMLInputElement>(null);

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileOk(false);
    const fd = new FormData();
    fd.set("displayName", displayName);
    fd.set("locale", locale);
    startProfile(async () => {
      const result = await updateProfileAction(fd);
      if (!result.success) {
        setProfileError(result.error ?? tc("error"));
      } else {
        setProfileOk(true);
        router.refresh();
      }
    });
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    const fd = new FormData();
    fd.set("avatar", file);
    startAvatar(async () => {
      const result = await updateAvatarAction(fd);
      if (!result.success) setAvatarError(result.error ?? tc("error"));
    });
  }

  function handleRemoveAvatar() {
    setAvatarError(null);
    startAvatar(async () => {
      await removeAvatarAction();
    });
  }

  return (
    <div className="space-y-8">
      {/* Avatar section */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t("avatar")}</h2>
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            {user.avatarPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/uploads/${user.avatarPath}`}
                alt={user.displayName}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-2xl font-bold text-accent-foreground ring-2 ring-border">
                {getInitials(user.displayName)}
              </div>
            )}
            {isPendingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isPendingAvatar}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-accent disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
              {t("changeAvatar")}
            </button>
            {user.avatarPath && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={isPendingAvatar}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-destructive hover:bg-accent disabled:opacity-60"
              >
                <X className="h-4 w-4" />
                {t("removeAvatar")}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
        </div>
        {avatarError && <p className="text-xs text-destructive">{avatarError}</p>}
      </div>

      {/* Profile fields */}
      <form onSubmit={handleProfileSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{t("displayName")}</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            minLength={2}
            maxLength={30}
            required
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Email</label>
          <input
            value={user.email}
            readOnly
            className="w-full rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">{ts("language")}</label>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="en">{ts("en")}</option>
            <option value="fr">{ts("fr")}</option>
          </select>
        </div>

        {profileError && <p className="text-sm text-destructive">{profileError}</p>}
        {profileOk && <p className="text-sm text-green-600 dark:text-green-400">{tc("success")}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPendingProfile}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {isPendingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
            {tc("save")}
          </button>
        </div>
      </form>
    </div>
  );
}
