import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Paperclip, Plus } from 'lucide-react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/button';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { PurchaseRequestModal } from '@/src/components/modals/PurchaseRequestModal';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { purchaseService } from '@/src/services/purchaseService';
import { formatCurrencyINR } from '@/src/lib/utils';
import { toast } from 'sonner';

export function PurchasesPage() {
  const { ctx, user, site } = useAuthContext();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = React.useState<string>('All');
  const [modalOpen, setModalOpen] = React.useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['purchases', ctx.companyId, ctx.siteId],
    queryFn: () => purchaseService.listPurchaseRequests(ctx),
  });

  const approveMutation = useMutation({
    mutationFn: (purchaseId: string) =>
      purchaseService.approvePurchaseRequest(ctx, purchaseId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success(`Approved ${updated.requestCode}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Approval blocked by policy');
    },
  });

  const filtered = requests.filter(
    (r) => statusFilter === 'All' || r.status === statusFilter
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Material & Purchase Requests"
        metadata={[
          site.name,
          `Approval Chain: ${ctx.policy.approvalChain.join(' → ')}`,
        ]}
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" />
            New Purchase Request
          </Button>
        }
      />

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          'All',
          'Draft',
          'Pending Site Manager Review',
          'Pending Procurement',
          'Approved',
          'Ordered',
        ].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
              statusFilter === st
                ? 'bg-[#101F35] text-white'
                : 'bg-white border border-slate-200 text-[#64748B] hover:text-[#101F35]'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-44 rounded-xl border border-slate-200 bg-white animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-2">
          <div className="text-sm font-semibold text-[#101F35]">
            No purchase requests match this filter
          </div>
          <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
            Submit Purchase Request
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((pr) => {
            const canApprove =
              user.role !== 'supervisor' &&
              (pr.requestedById !== user.id || user.effectivePermissions.approve_own_purchase) &&
              ['Pending Site Manager Review', 'Submitted'].includes(pr.status);

            return (
              <div
                key={pr.id}
                className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-num text-sm font-bold text-[#101F35]">
                        {pr.requestCode}
                      </span>
                      <StatusIndicator label={pr.priority} />
                      <StatusIndicator label={pr.status} />
                    </div>
                    <div className="text-xs text-[#64748B]">
                      Requested by {pr.requestedByName} · {pr.requestDate} · Needed by{' '}
                      <span className="font-mono-num font-medium text-[#172B4D]">
                        {pr.requiredDeliveryDate}
                      </span>{' '}
                      · Zone: {pr.workZone}
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-xs text-[#64748B]">Estimated Total</div>
                    <div className="text-lg font-bold font-mono-num text-[#101F35]">
                      {formatCurrencyINR(pr.totalEstimatedAmount)}
                    </div>
                  </div>
                </div>

                {/* Line Items Summary */}
                <div className="rounded-lg border border-slate-100 bg-slate-50/70 divide-y divide-slate-100">
                  {pr.items.map((item) => (
                    <div
                      key={item.id}
                      className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-[#172B4D]">
                          {item.materialName}
                        </span>{' '}
                        <span className="text-[#64748B]">({item.materialCategory})</span>
                      </div>
                      <div className="font-mono-num text-[#101F35]">
                        {item.quantity} {item.unit} × {formatCurrencyINR(item.estimatedUnitPrice)} ={' '}
                        <span className="font-semibold">
                          {formatCurrencyINR(item.estimatedTotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
                  <div>
                    <span className="font-semibold text-[#172B4D]">Reason:</span> {pr.reason}
                  </div>
                  <div className="flex items-center gap-3">
                    {pr.attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[#2563EB]">
                        <Paperclip className="w-3.5 h-3.5" />
                        {pr.attachments.length} attachment(s)
                      </span>
                    )}
                    <span>Current Stage: {pr.currentApprover}</span>
                  </div>
                </div>

                {canApprove && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => approveMutation.mutate(pr.id)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve Purchase Request
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PurchaseRequestModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
