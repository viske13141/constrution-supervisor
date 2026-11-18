import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MapPin, PackageCheck } from 'lucide-react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/button';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { SafeImage } from '@/src/components/shared/SafeImage';
import { MaterialReceiptModal } from '@/src/components/modals/MaterialReceiptModal';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { materialService } from '@/src/services/materialService';
import { toast } from 'sonner';

export function MaterialReceiptsPage() {
  const { ctx, user, site } = useAuthContext();
  const queryClient = useQueryClient();
  const [selectedReceiptId, setSelectedReceiptId] = React.useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = React.useState(false);

  const { data: receipts = [] } = useQuery({
    queryKey: ['material-receipts', ctx.companyId, ctx.siteId],
    queryFn: () => materialService.listReceipts(ctx),
  });

  const verifyMutation = useMutation({
    mutationFn: (receiptId: string) =>
      materialService.verifyInventoryPosting(ctx, receiptId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['material-receipts'] });
      toast.success(`Verified & posted ${updated.receivedQuantity} ${updated.unit} to site inventory.`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Inventory verification denied');
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Material Deliveries & Receipts"
        metadata={[
          site.name,
          'Inventory increases only after authorized receipt verification',
        ]}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setSelectedReceiptId(receipts.find((r) => r.status === 'Awaiting Delivery')?.id);
              setModalOpen(true);
            }}
          >
            <PackageCheck className="w-4 h-4" />
            Record Delivery
          </Button>
        }
      />

      <div className="space-y-3">
        {receipts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-[#64748B]">
            No material deliveries scheduled for {site.name}.
          </div>
        ) : (
          receipts.map((rec) => (
            <div
              key={rec.id}
              className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-num text-sm font-bold text-[#101F35]">
                      {rec.purchaseOrderCode}
                    </span>
                    <span className="text-xs font-mono-num text-[#64748B]">
                      ({rec.purchaseRequestCode})
                    </span>
                    <StatusIndicator label={rec.status} />
                  </div>
                  <div className="text-base font-semibold text-[#101F35]">
                    {rec.materialName}
                  </div>
                  <div className="text-xs text-[#64748B]">
                    Supplier: {rec.supplier} · Delivery Date: <span className="font-mono-num">{rec.deliveryDate}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedReceiptId(rec.id);
                      setModalOpen(true);
                    }}
                  >
                    {rec.status === 'Awaiting Delivery' ? 'Log Delivery' : 'Update Receipt'}
                  </Button>

                  {!rec.inventoryPosted &&
                    rec.status !== 'Awaiting Delivery' &&
                    user.effectivePermissions.verify_inventory_receipt && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => verifyMutation.mutate(rec.id)}
                        disabled={verifyMutation.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Verify & Post Inventory
                      </Button>
                    )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs">
                <div>
                  <div className="text-[#64748B]">Ordered</div>
                  <div className="font-mono-num font-bold text-[#101F35]">
                    {rec.orderedQuantity} {rec.unit}
                  </div>
                </div>
                <div>
                  <div className="text-[#64748B]">Received</div>
                  <div className="font-mono-num font-bold text-[#16A34A]">
                    {rec.receivedQuantity} {rec.unit}
                  </div>
                </div>
                <div>
                  <div className="text-[#64748B]">Damaged</div>
                  <div className="font-mono-num font-bold text-[#DC2626]">
                    {rec.damagedQuantity} {rec.unit}
                  </div>
                </div>
                <div>
                  <div className="text-[#64748B]">Remaining</div>
                  <div className="font-mono-num font-bold text-[#101F35]">
                    {rec.remainingQuantity} {rec.unit}
                  </div>
                </div>
                <div>
                  <div className="text-[#64748B]">Inventory Posting</div>
                  <div className="font-semibold text-[#101F35]">
                    {rec.inventoryPosted ? `Posted (${rec.verifiedBy})` : 'Not Posted Yet'}
                  </div>
                </div>
              </div>

              {rec.remarks && (
                <div className="text-xs text-[#64748B]">
                  <span className="font-semibold text-[#172B4D]">Remarks:</span> {rec.remarks}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
                {rec.challanFileName && (
                  <span>Challan: <span className="font-mono-num text-[#172B4D]">{rec.challanFileName}</span></span>
                )}
                {rec.gpsCaptureInfo && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
                    {rec.gpsCaptureInfo.captured
                      ? `${rec.gpsCaptureInfo.note} (±${rec.gpsCaptureInfo.accuracyMeters}m @ ${rec.gpsCaptureInfo.capturedAt})`
                      : rec.gpsCaptureInfo.note}
                  </span>
                )}
              </div>

              {rec.photoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {rec.photoUrls.map((url, idx) => (
                    <SafeImage
                      key={idx}
                      src={url}
                      alt={`Delivery proof ${idx + 1}`}
                      className="w-20 h-16 rounded-lg border border-slate-200"
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <MaterialReceiptModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialReceiptId={selectedReceiptId}
      />
    </div>
  );
}
