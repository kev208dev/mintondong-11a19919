/* 자금 · 회비 (로컬 데모)
 * NOTE: 실제 송금/정산은 없다. 금액은 이 프로토타입의 로컬 상태에만 기록되며,
 * 프로덕션에서는 서버 검증 + DB RLS로 권한을 재확인해야 한다. */
import { Plus, Trash2, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/badminton/store";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export function FinanceSection({ embedded = false }: { embedded?: boolean } = {}) {
  const { club, can, setMonthlyDues, addFinanceEntry, removeFinanceEntry } = useStore();
  const canView = can("VIEW_FINANCE");
  const canManage = can("MANAGE_FINANCE");
  const canDues = can("MANAGE_DUES");
  const [dues, setDues] = useState(String(club.finance.monthlyDues));
  const [kind, setKind] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const wrapperClass = embedded ? "min-w-0" : "mt-6 rounded-3xl border border-border bg-card shadow-soft p-4";

  useEffect(() => {
    setDues(String(club.finance.monthlyDues));
    setLabel("");
    setAmount("");
  }, [club.club.id, club.finance.monthlyDues]);

  if (!canView) {
    return (
      <section className={wrapperClass}>
        {embedded ? null : (
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">자금 · 회비</h2>
          </div>
        )}
        <p className="mt-2 rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground">
          자금 내역은 &apos;자금 보기&apos; 권한이 있는 역할(예: 총무)만 볼 수 있어요.
        </p>
      </section>
    );
  }

  const balance = club.finance.entries.reduce(
    (sum, e) => sum + (e.kind === "INCOME" ? e.amount : -e.amount),
    0,
  );

  return (
    <section className={wrapperClass}>
      <div className="flex items-center gap-2">
        {embedded ? null : <Wallet className="size-4 text-primary" />}
        {embedded ? null : (
          <h2 className="text-base font-bold text-foreground">자금 · 회비</h2>
        )}
        <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          데모 데이터
        </span>
      </div>


      <div className="mt-3 rounded-2xl bg-primary p-4 text-primary-foreground">
        <p className="text-[11px] font-semibold opacity-70">현재 잔액</p>
        <p className="mt-0.5 text-3xl font-extrabold tracking-tight">{won(balance)}</p>
        <p className="mt-2 text-[11px] opacity-80">월 회비 {won(club.finance.monthlyDues)}</p>
      </div>

      {canDues ? (
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number"
            step={1000}
            className="h-12 flex-1 rounded-2xl"
            value={dues}
            onChange={(e) => setDues(e.target.value)}
            placeholder="월 회비"
          />
          <Button
            className="h-12 rounded-2xl font-bold"
            onClick={() => {
              setMonthlyDues(Number(dues) || 0);
              toast.success("월 회비를 저장했어요.");
            }}
          >
            회비 저장
          </Button>
        </div>
      ) : null}

      {canManage ? (
        <div className="mt-3 space-y-2 rounded-2xl bg-secondary p-3">
          <div className="flex gap-1.5">
            {(["INCOME", "EXPENSE"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`h-10 flex-1 rounded-xl text-xs font-bold ${kind === k ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
              >
                {k === "INCOME" ? "수입" : "지출"}
              </button>
            ))}
          </div>
          <Input
            className="h-11 rounded-xl bg-background"
            placeholder="내용 (예: 셔틀콕 구매)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              type="number"
              className="h-11 flex-1 rounded-xl bg-background"
              placeholder="금액"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button
              className="h-11 rounded-xl font-bold"
              disabled={!label.trim() || !Number(amount)}
              onClick={() => {
                addFinanceEntry({
                  kind,
                  label: label.trim(),
                  amount: Math.abs(Number(amount)),
                });
                setLabel("");
                setAmount("");
                toast.success("내역을 등록했어요.");
              }}
            >
              <Plus className="mr-1 size-4" /> 등록
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-secondary p-3 text-[11px] text-secondary-foreground">
          조회 전용이에요. 수입·지출 등록은 &apos;자금 관리&apos; 권한이 필요해요.
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {club.finance.entries.map((e) => (
          <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">{e.label}</p>
              <p className="text-[11px] text-muted-foreground">
                {new Date(e.createdAt).toLocaleDateString("ko-KR")}
              </p>
            </div>
            <p
              className={`text-sm font-extrabold tabular-nums ${e.kind === "INCOME" ? "text-primary" : "text-destructive"}`}
            >
              {e.kind === "INCOME" ? "+" : "−"}
              {won(e.amount)}
            </p>
            {canManage ? (
              <button
                onClick={() => removeFinanceEntry(e.id)}
                aria-label={`${e.label} 삭제`}
                className="text-muted-foreground"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
          </li>
        ))}
        {club.finance.entries.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            아직 수입·지출 내역이 없어요.
          </li>
        ) : null}
      </ul>
      <p className="mt-2 text-[10px] text-muted-foreground">
        실제 송금·정산 기능은 포함되지 않은 데모 장부예요.
      </p>
    </section>
  );
}
