import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ClipboardCheck,
  ClipboardList,
  FileText,
  PackageCheck,
  Plus,
  ShieldAlert,
  ShoppingCart,
  UserPlus,
} from 'lucide-react';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { crewService } from '@/src/services/crewService';
import { attendanceService } from '@/src/services/attendanceService';
import { taskService } from '@/src/services/taskService';
import { purchaseService } from '@/src/services/purchaseService';
import { materialService } from '@/src/services/materialService';
import { safetyService } from '@/src/services/safetyService';
import { reportService } from '@/src/services/reportService';
import { communicationService } from '@/src/services/communicationService';
import { useAppStore } from '@/src/store/useAppStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { TaskDetailModal } from '@/src/components/tasks/TaskDetailModal';
import { AttendanceExceptionModal } from '@/src/components/modals/AttendanceExceptionModal';
import type { Task } from '@/src/types/models';
import { DEMO_TODAY } from '@/src/data/mockDatabase';
import { toast } from 'sonner';

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { ctx, user, project, site } = useAuthContext();
  const { setQuickActionModal } = useAppStore();

  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  const [reviewAttendanceId, setReviewAttendanceId] = React.useState<string | undefined>(undefined);
  const [attModalOpen, setAttModalOpen] = React.useState(false);

  const { data: workers = [], isLoading: loadingCrew } = useQuery({
    queryKey: ['crew', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => crewService.listAssignedWorkers(ctx),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => attendanceService.listAttendance(ctx),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => taskService.listTasks(ctx),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases', ctx.companyId, ctx.siteId],
    queryFn: () => purchaseService.listPurchaseRequests(ctx),
  });

  const { data: receipts = [] } = useQuery({
    queryKey: ['material-receipts', ctx.companyId, ctx.siteId],
    queryFn: () => materialService.listReceipts(ctx),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['safety', ctx.companyId, ctx.siteId],
    queryFn: () => safetyService.listIncidents(ctx),
  });

  const { data: dailyReports = [] } = useQuery({
    queryKey: ['daily-reports', ctx.companyId, ctx.siteId],
    queryFn: () => reportService.listDailyReports(ctx),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', ctx.companyId, ctx.siteId],
    queryFn: () => communicationService.listMessages(ctx),
  });

  const ackMutation = useMutation({
    mutationFn: (messageId: string) =>
      communicationService.acknowledgeMessage(ctx, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Update acknowledged.');
    },
  });

  // Live computed operational counts
  const assignedWorkersCount = workers.length;
  const presentCount = attendance.filter((a) => a.status === 'Present').length;
  const lateCount = attendance.filter((a) => a.status === 'Late').length;
  const absentCount = attendance.filter((a) => a.status === 'Absent').length;
  const onLeaveCount = attendance.filter((a) => a.status === 'On Leave').length;
  const notCheckedInCount = attendance.filter(
    (a) => a.status === 'Not Checked In' || a.status === 'Missing Checkout'
  ).length;
  const pendingReviewCount = attendance.filter((a) => a.pendingReview).length;

  const tasksAssignedCount = tasks.length;
  const tasksCompletedCount = tasks.filter((t) =>
    ['Completed', 'Submitted for Review', 'Approved'].includes(t.status)
  ).length;
  const pendingPurchasesCount = purchases.filter((p) =>
    ['Pending Site Manager Review', 'Pending Procurement', 'Pending Finance Approval', 'Submitted'].includes(p.status)
  ).length;
  const openSafetyCount = incidents.filter((s) => s.status !== 'Closed' && s.status !== 'Resolved').length;

  const todayReportSubmitted = dailyReports.some(
    (r) => r.date === DEMO_TODAY && r.status !== 'Draft'
  );

  // Build Today's Action Centre items
  const actionItems: Array<{
    id: string;
    category: string;
    title: string;
    detail: string;
    urgency: 'critical' | 'warning' | 'info';
    ctaLabel: string;
    onAction: () => void;
  }> = [];

  attendance
    .filter((a) => a.pendingReview)
    .forEach((a) => {
      actionItems.push({
        id: `act-att-${a.id}`,
        category: 'Attendance Review',
        title: `${a.workerName} (${a.status})`,
        detail: a.exceptionReason || 'Missing verification or check-in exception',
        urgency: 'warning',
        ctaLabel: 'Review Attendance',
        onAction: () => {
          setReviewAttendanceId(a.id);
          setAttModalOpen(true);
        },
      });
    });

  tasks
    .filter((t) => t.status === 'Blocked' || t.status === 'Assigned')
    .forEach((t) => {
      actionItems.push({
        id: `act-task-${t.id}`,
        category: t.status === 'Blocked' ? 'Blocked Task' : 'Not Started',
        title: t.title,
        detail: `${t.workZone} · ${t.assignments.length} workers assigned`,
        urgency: t.status === 'Blocked' ? 'critical' : 'info',
        ctaLabel: 'Open Task',
        onAction: () => setActiveTask(t),
      });
    });

  receipts
    .filter((r) => r.status === 'Awaiting Delivery' || r.status === 'Pending Verification')
    .forEach((r) => {
      actionItems.push({
        id: `act-rec-${r.id}`,
        category: 'Material Delivery',
        title: `${r.materialName} (${r.purchaseOrderCode})`,
        detail: r.remarks || `${r.orderedQuantity} ${r.unit} · ${r.status}`,
        urgency: 'warning',
        ctaLabel: r.status === 'Awaiting Delivery' ? 'Record Receipt' : 'View Receipt',
        onAction: () => navigate('/receipts'),
      });
    });

  incidents
    .filter((i) => i.status !== 'Closed' && i.status !== 'Resolved')
    .forEach((inc) => {
      actionItems.push({
        id: `act-saf-${inc.id}`,
        category: 'Safety Observation',
        title: `${inc.incidentCode}: ${inc.category}`,
        detail: `${inc.workZone} · ${inc.severity} severity`,
        urgency: 'critical',
        ctaLabel: 'Resolve Safety Issue',
        onAction: () => navigate('/safety'),
      });
    });

  if (!todayReportSubmitted) {
    actionItems.push({
      id: 'act-dsr',
      category: 'End-of-Day Report',
      title: 'Daily Site Report for 18 Nov 2026 not yet submitted',
      detail: 'Required before shift close at 05:30 PM',
      urgency: 'info',
      ctaLabel: 'Create Daily Report',
      onAction: () => setQuickActionModal('daily_report'),
    });
  }

  const summaryKpis = [
    { label: 'Assigned Workers', value: assignedWorkersCount, sub: 'Active crew roster', onClick: () => navigate('/crew') },
    { label: 'Present Today', value: presentCount, sub: `${assignedWorkersCount ? Math.round((presentCount / assignedWorkersCount) * 100) : 0}% on-site`, onClick: () => navigate('/attendance') },
    { label: 'Absent Today', value: absentCount, sub: 'Marked absent / leave', onClick: () => navigate('/attendance') },
    { label: 'Attendance Pending Review', value: pendingReviewCount, sub: 'Exceptions to verify', highlight: pendingReviewCount > 0 ? 'amber' : undefined, onClick: () => navigate('/attendance') },
    { label: 'Tasks Assigned', value: tasksAssignedCount, sub: 'Today & active cycle', onClick: () => navigate('/tasks') },
    { label: 'Tasks Completed', value: tasksCompletedCount, sub: 'Completed or in review', onClick: () => navigate('/tasks') },
    { label: 'Pending Purchase Requests', value: pendingPurchasesCount, sub: 'In approval pipeline', onClick: () => navigate('/purchases') },
    { label: 'Open Safety Issues', value: openSafetyCount, sub: 'Action required', highlight: openSafetyCount > 0 ? 'red' : undefined, onClick: () => navigate('/safety') },
  ];

  const activeWorkSummaryTasks = tasks.slice(0, 5);
  const firstName = user.name.split(' ')[0];

  const attendanceTotalSafe = assignedWorkersCount || 1;
  const pct = (n: number) => Math.round((n / attendanceTotalSafe) * 100);

  return (
    <div className="space-y-6">
      {/* Operational Header */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#101F35] tracking-tight">
                Good Morning, {firstName}!
              </h1>
              <StatusIndicator label={site.operationalStatus} />
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-[#64748B]">
              <span className="font-medium text-[#172B4D]">{project.name}</span>
              <span aria-hidden="true">·</span>
              <span>{site.name}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">18 November 2026</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">{site.shiftTiming}</span>
            </div>
            <div className="text-xs text-[#64748B]">
              Sample Demonstration Data · Role: {user.designation}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setQuickActionModal('attendance_exception')}
            >
              <ClipboardCheck className="w-4 h-4 text-[#2563EB]" />
              Mark Exception
            </Button>
            <Button
              size="sm"
              onClick={() => setQuickActionModal('assign_task')}
            >
              <Plus className="w-4 h-4" />
              Assign New Task
            </Button>
          </div>
        </div>
      </section>

      {/* Today's Operational Summary (8 KPIs) */}
      <section aria-label="Today's operational summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryKpis.map((kpi) => (
            <button
              key={kpi.label}
              type="button"
              onClick={kpi.onClick}
              className="text-left rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 hover:border-[#2563EB]/50 transition-colors cursor-pointer"
            >
              <div className="text-xs font-medium text-[#64748B] truncate">
                {kpi.label}
              </div>
              <div
                className={`mt-1.5 text-2xl sm:text-3xl font-bold font-mono-num ${
                  kpi.highlight === 'red'
                    ? 'text-[#DC2626]'
                    : kpi.highlight === 'amber'
                    ? 'text-[#D97706]'
                    : 'text-[#101F35]'
                }`}
              >
                {loadingCrew ? '—' : kpi.value}
              </div>
              <div className="mt-1 text-[11px] text-[#64748B] truncate">
                {kpi.sub}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Quick Actions Bar (Mobile-friendly large touch buttons) */}
      <section aria-label="Quick field actions">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { label: 'Mark Exception', icon: ClipboardCheck, action: () => setQuickActionModal('attendance_exception') },
            { label: 'Assign Task', icon: ClipboardList, action: () => setQuickActionModal('assign_task') },
            { label: 'Add Worker', icon: UserPlus, action: () => setQuickActionModal('add_worker') },
            { label: 'Purchase Request', icon: ShoppingCart, action: () => setQuickActionModal('purchase_request') },
            { label: 'Material Receipt', icon: PackageCheck, action: () => setQuickActionModal('material_receipt') },
            { label: 'Daily Report', icon: FileText, action: () => setQuickActionModal('daily_report') },
            { label: 'Safety Incident', icon: ShieldAlert, action: () => setQuickActionModal('safety_incident') },
          ].map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.label}
                type="button"
                onClick={qa.action}
                className="min-h-[48px] flex items-center justify-center sm:justify-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-[#101F35] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors cursor-pointer"
              >
                <Icon className="w-4 h-4 text-[#2563EB] shrink-0" />
                <span className="truncate">{qa.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Two-Column Operational Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 7 cols: Today's Action Centre + Daily Work Summary */}
        <div className="lg:col-span-7 space-y-5">
          {/* Today's Action Centre */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Today's Action Centre</CardTitle>
                <p className="text-xs text-[#64748B]">
                  Items requiring immediate supervisor verification or field action
                </p>
              </div>
              <span className="font-mono-num text-xs font-semibold text-[#101F35]">
                {actionItems.length} pending
              </span>
            </CardHeader>
            <div className="divide-y divide-slate-100">
              {actionItems.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#64748B]">
                  All site action items are up to date.
                </div>
              ) : (
                actionItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 text-xs">
                        <AlertTriangle
                          className={`w-3.5 h-3.5 shrink-0 ${
                            item.urgency === 'critical'
                              ? 'text-[#DC2626]'
                              : item.urgency === 'warning'
                              ? 'text-[#F59E0B]'
                              : 'text-[#2563EB]'
                          }`}
                        />
                        <span className="font-semibold text-[#64748B]">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-[#101F35] truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-[#64748B] truncate">
                        {item.detail}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={item.onAction}
                      className="self-start sm:self-center shrink-0"
                    >
                      <span>{item.ctaLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Daily Work Summary Table */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Daily Work Summary</CardTitle>
                <p className="text-xs text-[#64748B]">
                  Tap any activity to inspect instructions or update progress
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => navigate('/tasks')}>
                View All
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-[#64748B]">
                    <th className="py-2.5 px-4 sm:px-5 font-semibold">Activity</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Assigned Crew</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Progress</th>
                    <th className="py-2.5 px-4 sm:px-5 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeWorkSummaryTasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setActiveTask(t)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 sm:px-5">
                        <div className="font-medium text-[#101F35]">{t.title}</div>
                        <div className="text-xs text-[#64748B]">{t.workZone}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-medium">
                        {t.assignments.length}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num text-xs text-[#64748B]">
                        {t.progressPercent}%
                      </td>
                      <td className="py-3 px-4 sm:px-5 text-right">
                        <div className="inline-flex justify-end">
                          <StatusIndicator label={t.status} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right 5 cols: Crew Attendance Snapshot + Site Manager Updates */}
        <div className="lg:col-span-5 space-y-5">
          {/* Crew Attendance Snapshot */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Crew Attendance Snapshot</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/attendance')}>
                Manage
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-3 w-full rounded-full overflow-hidden bg-slate-100 flex">
                <div
                  style={{ width: `${pct(presentCount)}%` }}
                  className="bg-[#16A34A]"
                  title={`Present: ${presentCount}`}
                />
                <div
                  style={{ width: `${pct(lateCount)}%` }}
                  className="bg-[#F59E0B]"
                  title={`Late: ${lateCount}`}
                />
                <div
                  style={{ width: `${pct(notCheckedInCount)}%` }}
                  className="bg-[#2563EB]"
                  title={`Missing / Not Checked In: ${notCheckedInCount}`}
                />
                <div
                  style={{ width: `${pct(absentCount + onLeaveCount)}%` }}
                  className="bg-[#DC2626]"
                  title={`Absent / Leave: ${absentCount + onLeaveCount}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {[
                  { label: 'Total Assigned', count: assignedWorkersCount, bar: 'bg-[#101F35]' },
                  { label: 'Present', count: presentCount, bar: 'bg-[#16A34A]' },
                  { label: 'Late', count: lateCount, bar: 'bg-[#F59E0B]' },
                  { label: 'Absent', count: absentCount, bar: 'bg-[#DC2626]' },
                  { label: 'On Leave', count: onLeaveCount, bar: 'bg-slate-400' },
                  { label: 'Not Checked In / Missing', count: notCheckedInCount, bar: 'bg-[#2563EB]' },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <span className="text-[#64748B] truncate">{row.label}</span>
                    <span className="font-mono-num font-bold text-[#101F35]">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Latest Site Manager Updates */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Site Manager Updates</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => navigate('/messages')}>
                Open Messages
              </Button>
            </CardHeader>
            <div className="divide-y divide-slate-100">
              {messages.slice(0, 4).map((m) => {
                const acked = m.acknowledgedByIds.includes(user.id);
                return (
                  <div key={m.id} className="p-3.5 sm:px-5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#64748B]">
                      <span>{m.senderName} · {m.type}</span>
                      <span className="font-mono-num">{m.timestamp}</span>
                    </div>
                    <div className="text-sm font-semibold text-[#101F35]">
                      {m.subject}
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      {m.body}
                    </p>
                    <div className="pt-1">
                      {acked ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#16A34A]">
                          <Check className="w-3.5 h-3.5" /> Acknowledged
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => ackMutation.mutate(m.id)}
                          className="text-xs font-semibold text-[#2563EB] hover:underline cursor-pointer"
                        >
                          Acknowledge Update
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <TaskDetailModal task={activeTask} onClose={() => setActiveTask(null)} />
      <AttendanceExceptionModal
        open={attModalOpen}
        onClose={() => setAttModalOpen(false)}
        initialAttendanceId={reviewAttendanceId}
      />
    </div>
  );
}
