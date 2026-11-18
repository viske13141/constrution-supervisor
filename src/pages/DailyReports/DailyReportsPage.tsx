import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileText, Plus, Printer } from 'lucide-react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/button';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { SafeImage } from '@/src/components/shared/SafeImage';
import { DailyReportModal } from '@/src/components/modals/DailyReportModal';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { reportService } from '@/src/services/reportService';
import { toast } from 'sonner';

export function DailyReportsPage() {
  const { ctx, user, site } = useAuthContext();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = React.useState(false);

  const { data: reports = [] } = useQuery({
    queryKey: ['daily-reports', ctx.companyId, ctx.siteId],
    queryFn: () => reportService.listDailyReports(ctx),
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: 'Accepted' | 'Correction Requested';
    }) =>
      reportService.reviewDailyReport(
        ctx,
        id,
        decision,
        decision === 'Accepted'
          ? 'Reviewed and accepted in project site log.'
          : 'Please attach evening material consumption figures.'
      ),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
      toast.success(`Report for ${updated.date} marked ${updated.status}.`);
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Daily Site Reports"
        metadata={[site.name, 'End-of-day shift reports require explicit supervisor submission']}
        actions={
          <div className="flex items-center gap-2">
            {user.effectivePermissions.export_reports && (
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4" />
                Print View
              </Button>
            )}
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Create Daily Report
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-2">
            <FileText className="w-6 h-6 text-slate-400 mx-auto" />
            <div className="text-sm font-semibold text-[#101F35]">
              No Daily Site Reports recorded yet
            </div>
            <p className="text-xs text-[#64748B]">
              Supervisors submit a structured report at shift close. Reports are never auto-generated.
            </p>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              Create Today's Report
            </Button>
          </div>
        ) : (
          reports.map((rep) => (
            <div
              key={rep.id}
              className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-num text-sm font-bold text-[#101F35]">
                      {rep.date}
                    </span>
                    <StatusIndicator label={rep.status} />
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5">
                    Submitted by {rep.supervisorName} · {rep.shift}
                    {rep.submittedAt ? ` · ${rep.submittedAt}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono-num">
                  <span>Assigned: <strong>{rep.totalAssignedWorkers}</strong></span>
                  <span className="text-[#16A34A]">Present: <strong>{rep.presentWorkers}</strong></span>
                  <span className="text-[#DC2626]">Absent: <strong>{rep.absentWorkers}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <div className="text-xs font-semibold text-[#64748B]">Work Completed</div>
                  <p className="text-[#172B4D] mt-0.5">{rep.workCompleted}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#64748B]">Tasks In Progress / Delayed</div>
                  <p className="text-[#172B4D] mt-0.5">{rep.tasksInProgress}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#64748B]">Materials Consumed & Required</div>
                  <p className="text-[#172B4D] mt-0.5">{rep.materialsConsumed}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">Next: {rep.materialsRequired}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#64748B]">Tomorrow's Plan & Safety</div>
                  <p className="text-[#172B4D] mt-0.5">{rep.tomorrowsPlan}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">Safety: {rep.safetyObservations}</p>
                </div>
              </div>

              {rep.siteManagerFeedback && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-950">
                  <span className="font-semibold">Site Manager Review:</span> {rep.siteManagerFeedback}
                </div>
              )}

              {rep.photoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {rep.photoUrls.map((src, idx) => (
                    <SafeImage
                      key={idx}
                      src={src}
                      alt={`Report evidence ${idx + 1}`}
                      className="w-24 h-16 rounded-lg border border-slate-200"
                    />
                  ))}
                </div>
              )}

              {user.effectivePermissions.review_daily_reports &&
                rep.status === 'Submitted' && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        reviewMutation.mutate({
                          id: rep.id,
                          decision: 'Correction Requested',
                        })
                      }
                    >
                      Request Correction
                    </Button>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() =>
                        reviewMutation.mutate({ id: rep.id, decision: 'Accepted' })
                      }
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Accept Report
                    </Button>
                  </div>
                )}
            </div>
          ))
        )}
      </div>

      <DailyReportModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
