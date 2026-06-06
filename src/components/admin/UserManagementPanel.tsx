"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, KeyRound, Trash2, ShieldCheck, User } from "lucide-react";
import {
  adminCreateUserAction,
  adminResetPasswordAction,
  adminDeleteUserAction,
} from "@/server/actions/users";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/lib/utils";

type UserRow = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: Date | string;
};

type Props = { users: UserRow[]; currentUserId: string };

export function UserManagementPanel({ users, currentUserId }: Props) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");

  const [showCreate, setShowCreate] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t("createUser")}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-left text-xs font-medium text-muted-foreground">
              <th className="px-4 py-3">{t("users")}</th>
              <th className="px-4 py-3 hidden sm:table-cell">{t("role")}</th>
              <th className="px-4 py-3 hidden md:table-cell">{t("joinedAt")}</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="bg-card hover:bg-accent/30">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  {user.role === "ADMIN" ? (
                    <span className="flex items-center gap-1 text-amber-500">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {t("admin")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      {t("user")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setResetTarget(user)}
                      title={t("resetPassword")}
                      className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                    {user.id !== currentUserId && (
                      <button
                        onClick={() => setDeleteTarget(user)}
                        title={t("deleteUser")}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} />
      )}

      {resetTarget && (
        <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />
      )}

      {deleteTarget && (
        <DeleteUserConfirm user={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}

// ─── Create user modal ───────────────────────────────────────────────────────

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("admin");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await adminCreateUserAction(fd);
      if (!result.success) setError(result.error ?? tc("error"));
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        <div className="border-b border-border p-4">
          <h2 className="text-lg font-semibold text-foreground">{t("createUser")}</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {(["email", "displayName", "password", "confirmPassword"] as const).map((field) => (
            <div key={field} className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{ta(field)}</label>
              <input
                name={field}
                type={field.toLowerCase().includes("password") ? "password" : "text"}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">
              {tc("cancel")}
            </button>
            <button type="submit" disabled={isPending} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {tc("create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Reset password modal ─────────────────────────────────────────────────────

function ResetPasswordModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const t = useTranslations("admin");
  const ts = useTranslations("settings");
  const tc = useTranslations("common");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await adminResetPasswordAction(user.id, password);
      if (!result.success) setError(result.error ?? tc("error"));
      else { setOk(true); setPassword(""); }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl">
        <div className="border-b border-border p-4">
          <h2 className="text-base font-semibold text-foreground">{t("resetPassword")}</h2>
          <p className="text-xs text-muted-foreground">{user.displayName} ({user.email})</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{ts("newPassword")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {ok && <p className="text-sm text-green-600 dark:text-green-400">{tc("success")}</p>}
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-accent">
              {tc("cancel")}
            </button>
            <button type="submit" disabled={isPending} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {tc("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete user confirm ──────────────────────────────────────────────────────

function DeleteUserConfirm({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const t = useTranslations("admin");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await adminDeleteUserAction(user.id);
      onClose();
    });
  }

  return (
    <ConfirmDialog
      message={t("confirmDeleteUser")}
      onConfirm={handleConfirm}
      onCancel={onClose}
      destructive
    />
  );
}
