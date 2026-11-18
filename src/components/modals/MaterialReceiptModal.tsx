import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, MapPin, Trash2 } from 'lucide-react';
import { ResponsiveModal } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { materialService } from '@/src/services/materialService';
import { compressImagePreview } from '@/src/lib/utils';
import { toast } from 'sonner';

const schema = z.object({
  receiptId: z.string().min(1, 'Select delivery order'),
  receivedQuantity: z.coerce.number().min(0),
  damagedQuantity: z.coerce.number().min(0),
  shortQuantity: z.coerce.number().min(0),
  challanFileName: z.string().optional(),
  remarks: z.string().min(3, 'Enter gate/delivery inspection remarks'),
  captureGps: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function MaterialReceiptModal({
  open,
  onClose,
  initialReceiptId,
}: {
  open: boolean;
  onClose: () => void;
  initialReceiptId?: string;
}) {
  const { ctx, offlineMode, enqueueSyncAction } = useAuthContext();
  const queryClient = useQueryClient();
  const [photos, setPhotos] = React.useState<string[]>([]);

  const { data: receipts = [] } = useQuery({
    queryKey: ['material-receipts', ctx.companyId, ctx.siteId],
    queryFn: () => materialService.listReceipts(ctx),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      receiptId: initialReceiptId || '',
      receivedQuantity: 0,
      damagedQuantity: 0,
      shortQuantity: 0,
      challanFileName: '',
      remarks: '',
      captureGps: ctx.policy.enableGpsCapture,
    },
  });

  React.useEffect(() => {
    if (open) {
      const target =
        receipts.find((r) => r.id === initialReceiptId) ||
        receipts.find((r) => r.status === 'Awaiting Delivery') ||
        receipts[0];
      setPhotos([]);
      reset({
        receiptId: target?.id || '',
        receivedQuantity: target ? target.orderedQuantity : 0,
        damagedQuantity: 0,
        shortQuantity: 0,
        challanFileName: target?.challanFileName || '',
        remarks: '',
        captureGps: ctx.policy.enableGpsCapture,
      });
    }
  }, [open, initialReceiptId, receipts, ctx.policy.enableGpsCapture, reset]);

  const selectedId = watch('receiptId');
  const selectedRec = receipts.find((r) => r.id === selectedId);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const compressed = await compressImagePreview(file);
      setPhotos((prev) => [...prev, compressed.dataUrl]);
    }
    e.target.value = '';
  };

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      materialService.recordMaterialDelivery(ctx, {
        ...values,
        photoUrls: photos,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['material-receipts'] });
      toast.success(
        `Delivery recorded for ${updated.purchaseOrderCode}. Status: ${updated.status} (Inventory not posted until authorized verification).`
      );
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Unable to record receipt');
    },
  });

  const onSubmit = (values: FormValues) => {
    if (offlineMode) {
      enqueueSyncAction({
        idempotencyKey: `rec-${values.receiptId}-${Date.now()}`,
        actionType: 'MATERIAL_RECEIPT',
        title: `Material Delivery: ${selectedRec?.materialName || 'Delivery'}`,
        payloadSummary: `Received ${values.receivedQuantity} ${selectedRec?.unit || ''}`,
        executePayload: { ...values, photoUrls: photos },
      });
      toast.warning('Offline mode: Delivery record queued locally for sync.');
      onClose();
      return;
    }
    mutation.mutate(values);
  };

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title="Record Material Delivery Receipt"
      subtitle="Delivery submissions do not automatically increase inventory until authorized receipt verification."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#101F35] mb-1">
            Purchase Order / Expected Delivery
          </label>
          <select
            {...register('receiptId')}
            className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="">Select delivery...</option>
            {receipts.map((r) => (
              <option key={r.id} value={r.id}>
                {r.purchaseOrderCode} — {r.materialName} ({r.orderedQuantity} {r.unit}) [{r.status}]
              </option>
            ))}
          </select>
        </div>

        {selectedRec && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs flex flex-wrap justify-between gap-2">
            <div>
              <span className="font-semibold text-[#101F35]">Supplier: </span>
              <span>{selectedRec.supplier}</span>
            </div>
            <div className="font-mono-num">
              Ordered: {selectedRec.orderedQuantity} {selectedRec.unit} · PR: {selectedRec.purchaseRequestCode}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Received Qty
            </label>
            <input
              type="number"
              step="any"
              {...register('receivedQuantity')}
              className="w-full min-h-[40px] rounded-lg border border-slate-300 px-2.5 text-sm font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Damaged Qty
            </label>
            <input
              type="number"
              step="any"
              {...register('damagedQuantity')}
              className="w-full min-h-[40px] rounded-lg border border-slate-300 px-2.5 text-sm font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Short Qty
            </label>
            <input
              type="number"
              step="any"
              {...register('shortQuantity')}
              className="w-full min-h-[40px] rounded-lg border border-slate-300 px-2.5 text-sm font-mono-num"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#101F35] mb-1">
            Challan / Delivery Slip Reference
          </label>
          <input
            {...register('challanFileName')}
            placeholder="e.g., CHL-2026-9914.pdf"
            className="w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#101F35] mb-1">
            Delivery Inspection Remarks
          </label>
          <textarea
            rows={2}
            {...register('remarks')}
            placeholder="Seal condition, batch date, moisture check, vehicle number..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.remarks && (
            <p className="text-xs text-[#DC2626] mt-1">{errors.remarks.message}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#172B4D] hover:bg-slate-50 cursor-pointer">
            <Camera className="w-4 h-4 text-[#2563EB]" />
            <span>Capture Delivery Photo</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>

          {ctx.policy.enableGpsCapture && (
            <label className="inline-flex items-center gap-2 text-xs text-[#172B4D] cursor-pointer">
              <input
                type="checkbox"
                {...register('captureGps')}
                className="h-4 w-4 rounded border-slate-300 text-[#2563EB]"
              />
              <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Attach one-time gate GPS & timestamp</span>
            </label>
          )}
        </div>

        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photos.map((url, idx) => (
              <div key={idx} className="relative">
                <img src={url} alt="Delivery proof" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center text-[#DC2626] cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Submit Delivery Receipt'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
