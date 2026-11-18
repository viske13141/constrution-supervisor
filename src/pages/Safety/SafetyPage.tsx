import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Plus, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/button';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { SafeImage } from '@/src/components/shared/SafeImage';
import { SafetyIncidentModal } from '@/src/components/modals/SafetyIncidentModal';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { safetyService } from '@/src/services/safetyService';
import type { SafetyStatus } from '@/src/types/models';
import { toast } from 'sonner';

export function SafetyPage() {
  const { ctx, user, site } = useAuthContext();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = React.useState(false);

  const { data: incidents = [] } = useQuery({
    queryKey: ['safety', ctx.companyId, ctx.siteId],
    queryFn: () => safetyService.listIncidents(ctx),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SafetyStatus }) =>
      safetyService.updateIncidentStatus(ctx, id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['safety'] });
      toast.success(`${updated.incidentCode} updated to ${updated.status}.`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Status update denied');
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Safety Observations & Incident Reporting"
        metadata={[site.name, 'Critical incidents require Site Manager / EHS review to close']}
        actions={
          <Button size="sm" variant="danger" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Report Safety Issue
          </Button>
        }
      />

      <div className="space-y-3">
        {incidents.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-2">
            <ShieldAlert className="w-6 h-6 text-[#16A34A] mx-auto" />
            <div className="text-sm font-semibold text-[#101F35]">
              Zero open safety incidents at {site.name}
            </div>
            <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
              Log Safety Observation
            </Button>
          </div>
        ) : (
          incidents.map((inc) => {
            const closeBlocked =
              inc.requiresSiteManagerClose &&
              !user.effectivePermissions.close_critical_safety;

            return (
              <div
                key={inc.id}
                className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-num text-sm font-bold text-[#101F35]">
                        {inc.incidentCode}
                      </span>
                      <StatusIndicator label={inc.severity} />
                      <StatusIndicator label={inc.status} />
                    </div>
                    <div className="text-base font-semibold text-[#101F35]">
                      {inc.category} — {inc.workZone}
                    </div>
                    <div className="text-xs text-[#64748B]">
                      Reported by {inc.reportedByName} · <span className="font-mono-num">{inc.occurredAt}</span>
                      {inc.personInvolved ? ` · Involved: ${inc.personInvolved}` : ''}
                    </div>
                  </div>

                  {inc.status !== 'Closed' && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {inc.status !== 'Resolved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            statusMutation.mutate({ id: inc.id, status: 'Resolved' })
                          }
                        >
                          Mark Mitigated
                        </Button>
                      )}
                      {closeBlocked ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#64748B] px-2 py-1 rounded border border-slate-200 bg-slate-50">
                          <Lock className="w-3.5 h-3.5" /> Manager Close Only
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="navy"
                          onClick={() =>
                            statusMutation.mutate({ id: inc.id, status: 'Closed' })
                          }
                        >
                          Close Incident
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div>
                    <div className="text-xs font-semibold text-[#64748B]">Observation</div>
                    <p className="text-[#172B4D] mt-0.5">{inc.description}</p>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#64748B]">Immediate Action Taken</div>
                    <p className="text-[#172B4D] mt-0.5">{inc.immediateActionTaken}</p>
                  </div>
                </div>

                {inc.siteManagerNote && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                    <span className="font-semibold">Site Manager / EHS Directive:</span>{' '}
                    {inc.siteManagerNote}
                  </div>
                )}

                {inc.photoUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {inc.photoUrls.map((src, idx) => (
                      <SafeImage
                        key={idx}
                        src={src}
                        alt={`Safety photo ${idx + 1}`}
                        className="w-24 h-16 rounded-lg border border-slate-200"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <SafetyIncidentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
