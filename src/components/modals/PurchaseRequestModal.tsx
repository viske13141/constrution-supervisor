import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Paperclip, Plus, Trash2 } from 'lucide-react';
import { ResponsiveModal } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { purchaseService } from '@/src/services/purchaseService';
import { compressImagePreview, formatCurrencyINR } from '@/src/lib/utils';
import type { PurchaseAttachment } from '@/src/types/models';
import { toast } from 'sonner';

const MATERIAL_CATEGORIES = [
  'Cement',
  'Sand',
  'Aggregate',
  'Steel',
  'Bricks',
  'Tiles',
  'Paint',
  'Electrical materials',
  'Plumbing materials',
  'Safety equipment',
  'Tools',
  'Construction consumables',
];

const lineItemSchema = z.object({
  materialCategory: z.string().min(1),
  materialName: z.string().min(2, 'Material name required'),
  quantity: z.coerce.number().positive('Must be > 0'),
  unit: z.string().min(1, 'Unit required'),
  estimatedUnitPrice: z.coerce.number().min(0),
});

const schema = z.object({
  workZone: z.string().min(2, 'Specify work zone'),
  requiredDeliveryDate: z.string().min(1),
  supplierPreference: z.string().optional(),
  priority: z.enum(['Standard', 'Urgent', 'Critical']),
  reason: z.string().min(5, 'Provide purchase justification'),
  remarks: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'Add at least one material line item'),
});

type FormValues = z.infer<typeof schema>;

export function PurchaseRequestModal({
  open,
  onClose,
  prefillItem,
}: {
  open: boolean;
  onClose: () => void;
  prefillItem?: {
    materialCategory: string;
    materialName: string;
    quantity: number;
    unit: string;
    estimatedUnitPrice: number;
  };
}) {
  const { ctx, project, site, offlineMode, enqueueSyncAction } = useAuthContext();
  const queryClient = useQueryClient();
  const [attachments, setAttachments] = React.useState<PurchaseAttachment[]>([]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      workZone: `${site.name} – Main Zone`,
      requiredDeliveryDate: '2026-11-20',
      supplierPreference: '',
      priority: 'Urgent',
      reason: '',
      remarks: '',
      items: [
        prefillItem || {
          materialCategory: 'Cement',
          materialName: '',
          quantity: 50,
          unit: 'Bags',
          estimatedUnitPrice: 395,
        },
      ],
    },
  });

  React.useEffect(() => {
    if (open) {
      setAttachments([]);
      reset({
        workZone: `${site.name} – Main Zone`,
        requiredDeliveryDate: '2026-11-20',
        supplierPreference: '',
        priority: 'Urgent',
        reason: prefillItem ? `Replenish shortfall for ${prefillItem.materialName}` : '',
        remarks: '',
        items: [
          prefillItem || {
            materialCategory: 'Cement',
            materialName: '',
            quantity: 50,
            unit: 'Bags',
            estimatedUnitPrice: 395,
          },
        ],
      });
    }
  }, [open, prefillItem, site.name, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = watch('items');
  const grandTotal = (watchedItems || []).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.estimatedUnitPrice) || 0),
    0
  );

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const compressed = await compressImagePreview(file);
        setAttachments((prev) => [
          ...prev,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            fileName: compressed.name,
            fileType: 'image/jpeg',
            sizeBytes: compressed.compressedBytes,
            previewUrl: compressed.dataUrl,
          },
        ]);
      } else {
        setAttachments((prev) => [
          ...prev,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            fileName: file.name,
            fileType: file.type || 'application/pdf',
            sizeBytes: file.size,
          },
        ]);
      }
    }
    e.target.value = '';
  };

  const mutation = useMutation({
    mutationFn: ({ values, asDraft }: { values: FormValues; asDraft: boolean }) =>
      purchaseService.createPurchaseRequest(ctx, {
        ...values,
        asDraft,
        attachments,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success(
        created.status === 'Draft'
          ? `Saved draft ${created.requestCode}`
          : `Submitted ${created.requestCode} to ${created.currentApprover}`
      );
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Unable to submit purchase request');
    },
  });

  const submitWithMode = (asDraft: boolean) =>
    handleSubmit((values) => {
      if (offlineMode && !asDraft) {
        enqueueSyncAction({
          idempotencyKey: `pr-${Date.now()}`,
          actionType: 'PURCHASE_REQUEST',
          title: `Purchase Request (${values.items.length} items)`,
          payloadSummary: `${formatCurrencyINR(grandTotal)} · ${values.workZone}`,
          executePayload: { ...values, asDraft: false, attachments },
        });
        toast.warning('Offline mode: Purchase request queued locally for server submission.');
        onClose();
        return;
      }
      mutation.mutate({ values, asDraft });
    })();

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title="Submit Material & Purchase Request"
      subtitle={`${project.name} · ${site.name} · Approval Chain: ${ctx.policy.approvalChain.join(' → ')}`}
      maxWidthClass="max-w-3xl"
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Work Zone
            </label>
            <input
              {...register('workZone')}
              className="w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Required Delivery Date
            </label>
            <input
              type="date"
              {...register('requiredDeliveryDate')}
              className="w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Priority
            </label>
            <select
              {...register('priority')}
              className="w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="Standard">Standard</option>
              <option value="Urgent">Urgent</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Multi-line Material Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#101F35]">
              Material Line Items ({fields.length})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  materialCategory: 'Construction consumables',
                  materialName: '',
                  quantity: 1,
                  unit: 'Nos',
                  estimatedUnitPrice: 0,
                })
              }
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </Button>
          </div>

          <div className="space-y-2.5">
            {fields.map((field, index) => {
              const lineQty = Number(watchedItems?.[index]?.quantity || 0);
              const linePrice = Number(watchedItems?.[index]?.estimatedUnitPrice || 0);
              return (
                <div
                  key={field.id}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2.5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] text-[#64748B] mb-0.5">
                        Category
                      </label>
                      <select
                        {...register(`items.${index}.materialCategory`)}
                        className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2 text-xs"
                      >
                        {MATERIAL_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-8">
                      <label className="block text-[11px] text-[#64748B] mb-0.5">
                        Material Description
                      </label>
                      <input
                        {...register(`items.${index}.materialName`)}
                        placeholder="e.g., OPC 53 Cement / 16mm TMT Rebar"
                        className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-[#64748B] mb-0.5">
                        Qty
                      </label>
                      <input
                        type="number"
                        step="any"
                        {...register(`items.${index}.quantity`)}
                        className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-mono-num"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-[#64748B] mb-0.5">
                        Unit
                      </label>
                      <input
                        {...register(`items.${index}.unit`)}
                        placeholder="Bags"
                        className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-[#64748B] mb-0.5">
                        Est. Unit Price (₹)
                      </label>
                      <input
                        type="number"
                        step="any"
                        {...register(`items.${index}.estimatedUnitPrice`)}
                        className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-mono-num"
                      />
                    </div>
                    <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-2 min-h-[38px]">
                      <span className="text-xs font-semibold font-mono-num text-[#101F35]">
                        {formatCurrencyINR(lineQty * linePrice)}
                      </span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          aria-label="Remove item"
                          className="p-1.5 text-slate-400 hover:text-[#DC2626] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 py-2.5">
            <span className="text-xs font-medium text-[#64748B]">
              Estimated Request Total
            </span>
            <span className="text-base font-bold font-mono-num text-[#101F35]">
              {formatCurrencyINR(grandTotal)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Preferred Supplier (Optional)
            </label>
            <input
              {...register('supplierPreference')}
              placeholder="e.g., Deccan BuildMart"
              className="w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Reason for Purchase
            </label>
            <input
              {...register('reason')}
              placeholder="Explain task linkage & urgency..."
              className="w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
            />
            {errors.reason && (
              <p className="text-xs text-[#DC2626] mt-1">{errors.reason.message}</p>
            )}
          </div>
        </div>

        {/* Attachments */}
        <div>
          <label className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#172B4D] hover:bg-slate-50 cursor-pointer">
            <Paperclip className="w-4 h-4 text-[#2563EB]" />
            <span>Attach Quotation, Bill, or Site Photo</span>
            <input
              type="file"
              accept="image/*,.pdf,.xlsx,.doc,.docx"
              multiple
              onChange={handleAttachmentUpload}
              className="hidden"
            />
          </label>
          {attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs"
                >
                  {att.previewUrl && (
                    <img
                      src={att.previewUrl}
                      alt={att.fileName}
                      className="w-8 h-8 rounded object-cover"
                    />
                  )}
                  <span className="max-w-[160px] truncate font-medium">
                    {att.fileName}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((a) => a.id !== att.id))
                    }
                    className="text-slate-400 hover:text-[#DC2626] cursor-pointer"
                    aria-label="Remove file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-[#64748B]">
          Submitting a quotation or photo does not approve payment or release funds. Request routes through: {ctx.policy.approvalChain.join(' → ')}.
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => submitWithMode(true)}
          >
            Save Draft
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => submitWithMode(false)}
          >
            {mutation.isPending ? 'Submitting...' : 'Submit Purchase Request'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
