"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { useUi } from "@/components/ui/UiProvider";

type PortalUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  full_name: string | null;
  providers: string[];
  staff_role: string | null;
  staff_active: boolean | null;
  staff_row_id: string | null;
};

export function AdminUsersPageClient() {
  const { toast, confirm } = useUi();
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<PortalUser | null>(null);

  const [addForm, setAddForm] = useState({
    email: "",
    fullName: "",
    password: "",
    mode: "invite" as "invite" | "create",
    makeStaff: true,
    staffRole: "staff" as "owner" | "staff",
  });

  const [editForm, setEditForm] = useState({
    email: "",
    fullName: "",
    password: "",
    makeStaff: false,
    staffRole: "staff" as "owner" | "staff",
    staffActive: true,
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    const j = await res.json();
    if (!res.ok) {
      toast({ kind: "error", title: j.error || "Failed to load users" });
      return;
    }
    setUsers(j.users ?? []);
  }, [toast]);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(term) ||
        u.full_name?.toLowerCase().includes(term) ||
        u.staff_role?.toLowerCase().includes(term)
    );
  }, [users, q]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addForm.email,
          fullName: addForm.fullName || undefined,
          password: addForm.mode === "create" ? addForm.password : undefined,
          mode: addForm.mode,
          makeStaff: addForm.makeStaff,
          staffRole: addForm.makeStaff ? addForm.staffRole : undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      toast({
        kind: "success",
        title: addForm.mode === "invite" ? "Invite sent" : "User created",
        message: addForm.makeStaff
          ? `Also granted ${addForm.staffRole} access`
          : undefined,
      });
      setShowAdd(false);
      setAddForm({
        email: "",
        fullName: "",
        password: "",
        mode: "invite",
        makeStaff: true,
        staffRole: "staff",
      });
      await load();
    } catch (err) {
      toast({
        kind: "error",
        title: "Could not add user",
        message: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setBusy(false);
    }
  }

  function openEdit(u: PortalUser) {
    setEditing(u);
    setEditForm({
      email: u.email || "",
      fullName: u.full_name || "",
      password: "",
      makeStaff: Boolean(u.staff_role),
      staffRole: (u.staff_role as "owner" | "staff") || "staff",
      staffActive: u.staff_active !== false,
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editing.id,
          email: editForm.email || undefined,
          fullName: editForm.fullName,
          password: editForm.password || undefined,
          makeStaff: editForm.makeStaff || undefined,
          staffRole: editForm.makeStaff ? editForm.staffRole : undefined,
          staffActive: editForm.makeStaff ? editForm.staffActive : undefined,
          removeStaff: !editForm.makeStaff && Boolean(editing.staff_role),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Update failed");
      toast({ kind: "success", title: "User updated" });
      setEditing(null);
      await load();
    } catch (err) {
      toast({
        kind: "error",
        title: "Update failed",
        message: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setBusy(false);
    }
  }

  async function banUser(u: PortalUser, ban: boolean) {
    const ok = await confirm({
      title: ban ? "Ban user?" : "Unban user?",
      message: ban
        ? `${u.email} will not be able to sign in.`
        : `${u.email} will be allowed to sign in again.`,
      confirmLabel: ban ? "Ban" : "Unban",
      danger: ban,
    });
    if (!ok) return;
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, ban }),
    });
    if (!res.ok) {
      const j = await res.json();
      toast({ kind: "error", title: j.error || "Failed" });
      return;
    }
    toast({ kind: "success", title: ban ? "User banned" : "User unbanned" });
    await load();
  }

  async function deleteUser(u: PortalUser) {
    const ok = await confirm({
      title: "Delete user permanently?",
      message: `Delete ${u.email}? This removes their auth account and staff role.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    const res = await fetch(
      `/api/admin/users?id=${encodeURIComponent(u.id)}`,
      { method: "DELETE" }
    );
    const j = await res.json();
    if (!res.ok) {
      toast({ kind: "error", title: j.error || "Delete failed" });
      return;
    }
    toast({ kind: "success", title: "User deleted" });
    await load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-[var(--color-accent)]" />
          <div>
            <h1
              className="text-2xl font-bold text-[var(--color-text)]"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Users & staff
            </h1>
            <p className="text-sm text-[var(--color-muted)]">
              Owner-only. All Auth users in your Supabase project ({users.length}
              ).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[#05080f]"
        >
          <UserPlus className="h-4 w-4" /> Add / invite
        </button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, name, or role…"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] py-2.5 pl-10 pr-3 text-sm"
        />
      </div>

      <div className="overflow-auto rounded-2xl border border-[var(--color-border)]">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/50">
            <tr>
              <th className="p-3 text-[var(--color-muted)]">User</th>
              <th className="p-3 text-[var(--color-muted)]">Staff</th>
              <th className="p-3 text-[var(--color-muted)]">Status</th>
              <th className="p-3 text-[var(--color-muted)]">Last sign-in</th>
              <th className="p-3 text-[var(--color-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="p-8 text-center text-[var(--color-muted)]"
                >
                  No users match.
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const banned =
                  u.banned_until &&
                  new Date(u.banned_until).getTime() > Date.now();
                return (
                  <tr
                    key={u.id}
                    className="border-b border-[var(--color-border)]/50 align-top"
                  >
                    <td className="p-3">
                      <p className="font-medium text-[var(--color-text)]">
                        {u.full_name || "—"}
                      </p>
                      <p className="text-xs text-[var(--color-accent)]">
                        {u.email}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">
                        {u.providers?.join(", ") || "email"}
                      </p>
                    </td>
                    <td className="p-3">
                      {u.staff_role ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[11px] capitalize text-[var(--color-accent)]">
                          <Shield className="h-3 w-3" />
                          {u.staff_role}
                          {u.staff_active === false ? " (off)" : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-muted)]">
                          client
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      {banned ? (
                        <span className="text-red-400">Banned</span>
                      ) : u.email_confirmed_at ? (
                        <span className="text-emerald-400">Active</span>
                      ) : (
                        <span className="text-amber-300">Unconfirmed</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-[var(--color-muted)]">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleString()
                        : "Never"}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="rounded-lg border border-[var(--color-border)] p-1.5 text-[var(--color-muted)] hover:text-[var(--color-accent)]"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void banUser(u, !banned)}
                          className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-[10px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)]"
                        >
                          {banned ? "Unban" : "Ban"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteUser(u)}
                          className="rounded-lg border border-red-500/40 p-1.5 text-red-400 hover:bg-red-500/10"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showAdd ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <form
            onSubmit={(e) => void addUser(e)}
            className="w-full max-w-lg space-y-3 rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--glow-md)] sm:rounded-2xl"
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-[var(--color-accent)]" />
              <h2 className="text-lg font-semibold text-[var(--color-text)]">
                Add / invite user
              </h2>
            </div>
            <input
              required
              type="email"
              placeholder="Email"
              value={addForm.email}
              onChange={(e) =>
                setAddForm({ ...addForm, email: e.target.value })
              }
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
            <input
              placeholder="Full name (optional)"
              value={addForm.fullName}
              onChange={(e) =>
                setAddForm({ ...addForm, fullName: e.target.value })
              }
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              {(["invite", "create"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAddForm({ ...addForm, mode: m })}
                  className={clsx(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize",
                    addForm.mode === m
                      ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
                      : "text-[var(--color-muted)]"
                  )}
                >
                  {m === "invite" ? "Send invite email" : "Create with password"}
                </button>
              ))}
            </div>
            {addForm.mode === "create" ? (
              <input
                required
                type="password"
                minLength={8}
                placeholder="Temporary password (min 8)"
                value={addForm.password}
                onChange={(e) =>
                  setAddForm({ ...addForm, password: e.target.value })
                }
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
              />
            ) : null}
            <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <input
                type="checkbox"
                checked={addForm.makeStaff}
                onChange={(e) =>
                  setAddForm({ ...addForm, makeStaff: e.target.checked })
                }
              />
              Grant admin portal access (staff)
            </label>
            {addForm.makeStaff ? (
              <select
                value={addForm.staffRole}
                onChange={(e) =>
                  setAddForm({
                    ...addForm,
                    staffRole: e.target.value as "owner" | "staff",
                  })
                }
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
              >
                <option value="staff">staff</option>
                <option value="owner">owner</option>
              </select>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[#05080f] disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <form
            onSubmit={(e) => void saveEdit(e)}
            className="w-full max-w-lg space-y-3 rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:rounded-2xl"
          >
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              Edit user
            </h2>
            <input
              required
              type="email"
              value={editForm.email}
              onChange={(e) =>
                setEditForm({ ...editForm, email: e.target.value })
              }
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
            <input
              placeholder="Full name"
              value={editForm.fullName}
              onChange={(e) =>
                setEditForm({ ...editForm, fullName: e.target.value })
              }
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
            <input
              type="password"
              minLength={8}
              placeholder="New password (leave blank to keep)"
              value={editForm.password}
              onChange={(e) =>
                setEditForm({ ...editForm, password: e.target.value })
              }
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <input
                type="checkbox"
                checked={editForm.makeStaff}
                onChange={(e) =>
                  setEditForm({ ...editForm, makeStaff: e.target.checked })
                }
              />
              Admin portal access
            </label>
            {editForm.makeStaff ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={editForm.staffRole}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      staffRole: e.target.value as "owner" | "staff",
                    })
                  }
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
                >
                  <option value="staff">staff</option>
                  <option value="owner">owner</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                  <input
                    type="checkbox"
                    checked={editForm.staffActive}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        staffActive: e.target.checked,
                      })
                    }
                  />
                  Staff active
                </label>
              </div>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[#05080f] disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
