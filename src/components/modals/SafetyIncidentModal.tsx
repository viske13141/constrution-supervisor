import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Camera, Trash2 } from 'lucide-react';
import { ResponsiveModal } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { safetyService } from '@/src/services/safetyService';
import { compressImagePreview } from '@/src/lib/utils';
import type { SafetyCategory, SafetySeverity } from '@/src/types/models';
import { toast } from 'sonner';

const CATEGORIES: SafetyCategory[] = [
  'Worker Injury',
  'Unsafe Working Condition',
  'Missing PPE',
  'Equipment Hazard',
  'Electrical Hazard',
  'Fire Risk',
  'Near Miss',
  'Other Site Incident',
];

const schema = z.object({
  category: z.string().min(1),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
  workZone: z.string().min(2, 'Specify site work zone'),
  occurredAt: z.string().min(2),
  personInvolved: z.string().optional(),
  description: z.string().min(8, 'Provide detailed observation'),
  immediateActionTaken: z.string().min(5, 'Describe immediate containment action'),
  witnessInfo: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function SafetyIncidentModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { ctx, site, offlineMode, enqueueSyncAction } = useAuthContext();
  const queryClient = useQueryClient();
  const [photos, setPhotos] = React.useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: 'Unsafe Working Condition',
      severity: 'Medium',
      workZone: `${site.name} – Floor 2`,
      occurredAt: '2026-11-18 10:30 AM',
      personInvolved: '',
      description: '',
      immediateActionTaken: '',
      witnessInfo: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      setPhotos([]);
      reset({
        category: 'Unsafe Working Condition',
        severity: 'Medium',
        workZone: `${site.name} – Floor 2`,
        occurredAt: '2026-11-18 10:30 AM',
        personInvolved: '',
        description: '',
        immediateActionTaken: '',
        witnessInfo: '',
      });
    }
  }, [open, site.name, reset]);

  const severity = watch('severity');

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
      safetyService.reportIncident(ctx, {
        category: values.category as SafetyCategory,
        severity: values.severity as SafetySeverity,
        workZone: values.workZone,
        occurredAt: values.occurredAt,
        personInvolved: values.personInvolved,
        description: values.description,
        immediateActionTaken: values.immediateActionTaken,
        witnessInfo: values.witnessInfo,
        photoUrls: photos,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['safety'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(
        created.severity === 'Critical'
          ? `${created.incidentCode} logged — Critical alert sent to Site Manager & EHS.`
          : `Safety observation ${created.incidentCode} reported.`
      );
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Unable to log incident');
    },
  });

  const onSubmit = (values: FormValues) => {
    if (offlineMode) {
      enqueueSyncAction({
        idempotencyKey: `saf-${Date.now()}`,
        actionType: 'SAFETY_INCIDENT',
        title: `Safety Report: ${values.category}`,
        payloadSummary: `${values.severity} · ${values.workZone}`,
        executePayload: { ...values, photoUrls: photos },
      });
      toast.warning('Offline mode: Safety report queued locally for sync.');
      onClose();
      return;
    }
    mutation.mutate(values);
  };

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title="Report Safety Observation or Incident"
      subtitle={`${site.name} · Critical incidents automatically escalate to Site Manager & Safety Officer.`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {severity === 'Critical' && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
            <div>
              Critical incidents notify designated Site Managers immediately and cannot be closed without authorized EHS/Site Manager review.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Incident Category
            </label>
            <select
              {...register('category')}
              className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Severity
            </label>
            <select
              {...register('severity')}
              className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Work Zone
            </label>
            <input
              {...register('workZone')}
              className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Date & Time
            </label>
            <input
              {...register('occurredAt')}
              className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-sm font-mono-num"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Person / Crew Involved (Optional)
            </label>
            <input
              {...register('personInvolved')}
              placeholder="Name or trade crew"
              className="w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Witness Info (Optional)
            </label>
            <input
              {...register('witnessInfo')}
              placeholder="Lead mason / site watchman"
              className="w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#101F35] mb-1">
            Incident / Hazard Description
          </label>
          <textarea
            rows={2}
            {...register('description')}
            placeholder="What occurred or was observed?"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.description && (
            <p className="text-xs text-[#DC2626] mt-1">{errors.description.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#101F35] mb-1">
            Immediate Action Taken
          </label>
          <textarea
            rows={2}
            {...register('immediateActionTaken')}
            placeholder="Zone barricaded, power isolated, first-aid given..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {errors.immediateActionTaken && (
            <p className="text-xs text-[#DC2626] mt-1">
              {errors.immediateActionTaken.message}
            </p>
          )}
        </div>

        <div>
          <label className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#172B4D] hover:bg-slate-50 cursor-pointer">
            <Camera className="w-4 h-4 text-[#2563EB]" />
            <span>Attach Hazard / Site Photo</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </label>
          {photos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {photos.map((url, idx) => (
                <div key={idx} className="relative">
                  <img src={url} alt="Safety evidence" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
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
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={severity === 'Critical' ? 'danger' : 'default'}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Submitting...' : 'Submit Safety Report'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
