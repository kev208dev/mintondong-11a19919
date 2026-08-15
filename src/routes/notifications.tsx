import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  listNotificationsFn,
  markAllNotificationsReadFn,
  markNotificationReadFn,
} from "@/lib/notifications/notifications.functions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/notifications")({
  ssr: false,
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => listNotificationsFn(),
    enabled: Boolean(user) && !loading,
  });
  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationReadFn({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["notifications-unread", user?.id] });
    },
  });
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsReadFn(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["notifications-unread", user?.id] });
    },
  });

  if (loading) return <div className="h-40 animate-pulse rounded-[20px] bg-secondary" />;
  if (!user && !loading)
    return (
      <section className="py-16 text-center">
        <Bell className="mx-auto size-10 text-brand-green" />
        <h1 className="mt-4 page-heading">알림은 로그인 후 확인할 수 있어요</h1>
        <Button asChild className="mt-6 h-11 rounded-2xl">
          <Link to="/auth" search={{ next: "/notifications" }}>
            로그인하기
          </Link>
        </Button>
      </section>
    );
  const notifications = query.data ?? [];
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          onClick={() => navigate({ to: "/" })}
          aria-label="뒤로"
        >
          <ChevronLeft />
        </Button>
        <h1 className="page-heading">알림</h1>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto gap-1 text-sm font-bold text-foreground"
          onClick={() => markAll.mutate()}
          disabled={!notifications.some((n) => !n.readAt)}
        >
          <CheckCheck className="size-4" />
          모두 읽음
        </Button>
      </div>
      {query.isLoading ? (
        <div className="h-32 animate-pulse rounded-[20px] bg-secondary" />
      ) : notifications.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <Bell className="mx-auto size-8 text-brand-green" />
          <p className="mt-3 font-bold">새 알림이 없어요</p>
        </div>
      ) : (
        <ul className="surface-card divide-y divide-border overflow-hidden">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                className={`flex w-full items-start gap-3 p-4 text-left transition active:bg-secondary ${notification.readAt ? "bg-white" : "bg-brand-wash/40"}`}
                onClick={async () => {
                  if (!notification.readAt) await markRead.mutateAsync(notification.id);
                  if (notification.deepLink?.startsWith("/"))
                    await navigate({ to: notification.deepLink as never });
                }}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-foreground">
                  <Bell className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-base font-bold">{notification.title}</strong>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                    {notification.body}
                  </span>
                  <time className="mt-2 block text-sm text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString("ko-KR", {
                      month: "numeric",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </span>
                {!notification.readAt && (
                  <i className="mt-2 size-2 rounded-full bg-brand-green" aria-label="읽지 않음" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
