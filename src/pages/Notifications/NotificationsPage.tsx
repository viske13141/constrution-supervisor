import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Bell, CheckCheck } from 'lucide-react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/button';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { communicationService } from '@/src/services/communicationService';
import { toast } from 'sonner';

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { ctx, site } = useAuthContext();
  const [onlyUnread, setOnlyUnread] = React.useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => communicationService.listNotifications(ctx),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => communicationService.markNotificationRead(ctx, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => communicationService.markAllNotificationsRead(ctx),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read.');
    },
  });

  const filtered = notifications.filter((n) => !onlyUnread || !n.read);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Operational Notifications"
        metadata={[site.name, 'Scoped to your assigned site and crew updates']}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={onlyUnread ? 'navy' : 'outline'}
              onClick={() => setOnlyUnread(!onlyUnread)}
            >
              {onlyUnread ? 'Showing Unread' : 'Filter Unread'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllMutation.mutate()}
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </Button>
          </div>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Bell className="w-6 h-6 text-slate-400 mx-auto" />
            <div className="text-sm font-semibold text-[#101F35]">
              No notifications to display
            </div>
          </div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                n.read ? 'bg-white' : 'bg-blue-50/35'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusIndicator
                    label={n.category}
                    tone={
                      n.severity === 'critical'
                        ? 'danger'
                        : n.severity === 'warning'
                        ? 'warning'
                        : 'info'
                    }
                  />
                  {!n.read && (
                    <span className="text-xs font-semibold text-[#2563EB]">Unread</span>
                  )}
                  <span className="text-xs font-mono-num text-[#64748B]">
                    {n.createdAt}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#101F35]">
                  {n.title}
                </div>
                <p className="text-xs text-[#64748B]">{n.message}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!n.read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markReadMutation.mutate(n.id)}
                  >
                    Mark Read
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!n.read) markReadMutation.mutate(n.id);
                    navigate(n.actionRoute);
                  }}
                >
                  Open <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
