/* 역할 및 권한 관리 UI (클럽 단위)
 * NOTE(보안): 여기서의 숨김/비활성은 UX 보호다. 실제 인증·백엔드를 붙이면
 * 동일 규칙을 서버 함수와 DB RLS에서 반드시 재검증해야 한다. */
import { Check, Copy, Plus, Shield, Trash2, Users2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  PERMISSION_GROUPS,
  ROLE_COLORS,
  roleBadgeClass,
  type PermissionKey,
  type RoleDefinition,
} from "@/lib/badminton/permissions";
import { useStore } from "@/lib/badminton/store";
import { LEVEL_LABEL } from "@/lib/badminton/types";

export function RoleBadges({ memberId }: { memberId: string }) {
  const { getMemberRoles, isProtectedOwner } = useStore();
  const roles = getMemberRoles(memberId);
  const isOwnerMember = isProtectedOwner(memberId);
  if (!roles.length && !isOwnerMember) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {isOwnerMember ? (
        <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
          소유자
        </span>
      ) : null}
      {roles.map((r) => (
        <span
          key={r.id}
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${roleBadgeClass(r.color)}`}
        >
          {r.name}
        </span>
      ))}
    </span>
  );
}

interface EditorState {
  roleId: string | null;
  name: string;
  description: string;
  color: string;
  permissions: PermissionKey[];
}

const blankEditor: EditorState = {
  roleId: null,
  name: "",
  description: "",
  color: "primary",
  permissions: [],
};

export function RolesSection({ embedded = false }: { embedded?: boolean } = {}) {
  const {
    club,
    can,
    isOwner,
    createRole,
    updateRole,
    duplicateRole,
    deleteRole,
    getMemberRoles,
    setMemberRoles,
    meMemberId,
    isProtectedOwner,
  } = useStore();
  const canManageRoles = can("MANAGE_ROLES");
  const canAssign = can("ASSIGN_ROLES");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [assignId, setAssignId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string | "ALL">("ALL");

  const memberCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ids of Object.values(club.memberRoles)) {
      for (const id of ids) map[id] = (map[id] ?? 0) + 1;
    }
    return map;
  }, [club.memberRoles]);

  const filtered =
    filterRole === "ALL"
      ? club.members
      : club.members.filter((m) => (club.memberRoles[m.id] ?? []).includes(filterRole));

  const assignMember = assignId ? club.members.find((m) => m.id === assignId) : null;

  function openEdit(role: RoleDefinition) {
    setEditor({
      roleId: role.id,
      name: role.name,
      description: role.description ?? "",
      color: role.color ?? "slate",
      permissions: [...role.permissions],
    });
  }

  function save() {
    if (!editor) return;
    const res = editor.roleId
      ? updateRole(editor.roleId, {
          name: editor.name,
          description: editor.description,
          color: editor.color,
          permissions: editor.permissions,
        })
      : createRole({
          name: editor.name,
          description: editor.description,
          color: editor.color,
          permissions: editor.permissions,
        });
    if (res.ok) {
      toast.success(res.message);
      setEditor(null);
    } else toast.error(res.message);
  }

  return (
    <section
      className={
        embedded ? "min-w-0" : "mt-6 rounded-3xl border border-border bg-card shadow-soft p-4"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          {embedded ? null : (
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary" />
              <h2 className="text-base font-bold text-foreground">역할 및 권한</h2>
            </div>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            총무·회장·코치처럼 원하는 역할을 만들고 권한을 세밀하게 정할 수 있어요. 역할은 클럽별로
            따로 저장돼요.
          </p>
        </div>
        {canManageRoles ? (
          <Button
            size="sm"
            className="h-9 shrink-0 rounded-full font-bold"
            onClick={() => setEditor({ ...blankEditor })}
          >
            <Plus className="mr-1 size-4" /> 역할
          </Button>
        ) : null}
      </div>

      <ul className="mt-3 space-y-2">
        {club.roles.map((r) => (
          <li key={r.id} className="rounded-2xl bg-secondary p-3">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${roleBadgeClass(r.color)}`}
              >
                {r.name}
              </span>
              {r.isSystem ? (
                <span className="text-[10px] font-bold text-muted-foreground">기본</span>
              ) : null}
              <span className="ml-auto text-[11px] font-bold text-muted-foreground">
                멤버 {memberCount[r.id] ?? 0}명 · 권한 {r.permissions.length}개
              </span>
            </div>
            {r.description ? (
              <p className="mt-1 text-[11px] text-muted-foreground">{r.description}</p>
            ) : null}
            {canManageRoles ? (
              <div className="mt-2 flex gap-1.5">
                <Button
                  variant="secondary"
                  className="h-9 flex-1 rounded-xl bg-background text-xs font-bold"
                  onClick={() => openEdit(r)}
                >
                  권한 편집
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-9 rounded-xl bg-background"
                  aria-label={`${r.name} 복제`}
                  onClick={() => {
                    const res = duplicateRole(r.id);
                    res.ok ? toast.success(res.message) : toast.error(res.message);
                  }}
                >
                  <Copy className="size-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-9 rounded-xl bg-background text-destructive"
                  aria-label={`${r.name} 삭제`}
                  onClick={() => {
                    if (!window.confirm(`'${r.name}' 역할을 삭제할까요? 멤버 배정도 해제됩니다.`))
                      return;
                    const res = deleteRole(r.id);
                    res.ok ? toast.success(res.message) : toast.error(res.message);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Users2 className="size-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">멤버 역할 배정</h3>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilterRole("ALL")}
            className={`h-8 rounded-full px-3 text-[11px] font-bold ${filterRole === "ALL" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            전체
          </button>
          {club.roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setFilterRole(r.id)}
              className={`h-8 rounded-full px-3 text-[11px] font-bold ${filterRole === r.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
            >
              {r.name}
            </button>
          ))}
        </div>
        <ul className="mt-3 space-y-2">
          {filtered.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
              <span className="grid size-10 place-items-center rounded-xl bg-background text-sm font-bold">
                {m.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {m.name}
                  {m.id === meMemberId ? (
                    <span className="ml-1 text-[10px] text-muted-foreground">나</span>
                  ) : null}
                </p>
                <p className="text-[11px] text-muted-foreground">{LEVEL_LABEL[m.level]}</p>
                <RoleBadges memberId={m.id} />
              </div>
              {isProtectedOwner(m.id) ? (
                <span className="shrink-0 text-[10px] font-bold text-muted-foreground">
                  변경 불가
                </span>
              ) : canAssign ? (
                <button
                  onClick={() => setAssignId(m.id)}
                  className="h-9 shrink-0 rounded-full bg-background px-3 text-[11px] font-bold"
                >
                  역할 변경
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {!canAssign ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            역할을 부여하려면 &apos;역할 부여&apos; 권한이 필요해요.
          </p>
        ) : null}
      </div>

      {/* 역할 편집 다이얼로그 */}
      <Dialog open={editor !== null} onOpenChange={(o) => !o && setEditor(null)}>
        <DialogContent className="max-h-[85vh] max-w-[360px] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editor?.roleId ? "역할 편집" : "새 역할 만들기"}</DialogTitle>
          </DialogHeader>
          {editor ? (
            <div className="space-y-3">
              <Input
                className="h-12 rounded-2xl"
                placeholder="역할 이름 (예: 촬영 담당)"
                value={editor.name}
                onChange={(e) => setEditor({ ...editor, name: e.target.value })}
              />
              <Input
                className="h-12 rounded-2xl"
                placeholder="설명 (선택)"
                value={editor.description}
                onChange={(e) => setEditor({ ...editor, description: e.target.value })}
              />
              <div className="flex gap-2">
                {ROLE_COLORS.map((c) => (
                  <button
                    key={c}
                    aria-label={`색상 ${c}`}
                    onClick={() => setEditor({ ...editor, color: c })}
                    className={`size-8 rounded-full ${roleBadgeClass(c)} ${editor.color === c ? "ring-2 ring-foreground ring-offset-2" : ""}`}
                  />
                ))}
              </div>
              {!editor.roleId ? (
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground">
                    기존 역할에서 권한 복사
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {club.roles.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setEditor({ ...editor, permissions: [...r.permissions] })}
                        className="h-8 rounded-full bg-secondary px-3 text-[11px] font-bold"
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {PERMISSION_GROUPS.map((g) => {
                const allOn = g.items.every((i) => editor.permissions.includes(i.key));
                return (
                  <div key={g.key} className="rounded-2xl bg-secondary p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-extrabold text-secondary-foreground">{g.label}</p>
                      <button
                        onClick={() =>
                          setEditor({
                            ...editor,
                            permissions: allOn
                              ? editor.permissions.filter(
                                  (p) => !g.items.some((i) => i.key === p),
                                )
                              : Array.from(
                                  new Set([...editor.permissions, ...g.items.map((i) => i.key)]),
                                ),
                          })
                        }
                        className="h-7 rounded-full bg-background px-2.5 text-[10px] font-bold"
                      >
                        {allOn ? "전체 해제" : "전체 선택"}
                      </button>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {g.items.map((i) => {
                        const on = editor.permissions.includes(i.key);
                        const locked = i.key === "MANAGE_ROLES" && !isOwner && !can("MANAGE_ROLES");
                        return (
                          <li key={i.key}>
                            <button
                              disabled={locked}
                              onClick={() =>
                                setEditor({
                                  ...editor,
                                  permissions: on
                                    ? editor.permissions.filter((p) => p !== i.key)
                                    : [...editor.permissions, i.key],
                                })
                              }
                              className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left ${on ? "bg-primary/15" : "bg-background"} ${locked ? "opacity-50" : ""}`}
                            >
                              <span
                                className={`grid size-5 shrink-0 place-items-center rounded-md ${on ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                              >
                                {on ? <Check className="size-3.5" /> : null}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-xs font-bold text-foreground">
                                  {i.label}
                                </span>
                                <span className="block text-[10px] text-muted-foreground">
                                  {i.desc}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}

              <Button
                className="h-12 w-full rounded-2xl font-bold"
                disabled={!editor.name.trim()}
                onClick={save}
              >
                저장
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 멤버 역할 배정 다이얼로그 */}
      <Dialog open={assignMember !== null} onOpenChange={(o) => !o && setAssignId(null)}>
        <DialogContent className="max-w-[340px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>{assignMember?.name} 역할</DialogTitle>
          </DialogHeader>
          {assignMember ? (
            <ul className="space-y-1.5">
              {club.roles.map((r) => {
                const on = getMemberRoles(assignMember.id).some((x) => x.id === r.id);
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => {
                        const cur = getMemberRoles(assignMember.id).map((x) => x.id);
                        const next = on ? cur.filter((x) => x !== r.id) : [...cur, r.id];
                        const res = setMemberRoles(assignMember.id, next);
                        res.ok ? toast.success(res.message) : toast.error(res.message);
                      }}
                      className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 ${on ? "bg-primary/15" : "bg-secondary"}`}
                    >
                      <span
                        className={`grid size-5 place-items-center rounded-md ${on ? "bg-primary text-primary-foreground" : "bg-background"}`}
                      >
                        {on ? <Check className="size-3.5" /> : <X className="size-3 opacity-30" />}
                      </span>
                      <span className="text-xs font-bold text-foreground">{r.name}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        권한 {r.permissions.length}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <p className="text-[11px] text-muted-foreground">
            여러 역할을 함께 부여할 수 있고, 실제 권한은 모든 역할의 합집합이에요.
          </p>
        </DialogContent>
      </Dialog>
    </section>
  );
}
