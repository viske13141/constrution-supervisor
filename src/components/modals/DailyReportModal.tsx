import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Trash2 } from 'lucide-react';
import { ResponsiveModal } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { crewService } from '@/src/services/crewService';
import { reportService } from '@/src/services/reportService';
import { compressImagePreview } from '@/src/lib/utils';
import { toast } from 'sonner';

const schema = z.object({
  date: z.string().min(1),
  shift: z.string().min(1),
  totalAssignedWorkers: z.coerce.number().min(0),
  presentWorkers: z.coerce.number().min(0),
  absentWorkers: z.coerce.number().min(0),
  workCompleted: z.string().min(5, 'Summarize work completed today'),
  tasksInProgress: z.string().min(3),
  tasksDelayed: z.string().optional(),
  materialsConsumed: z.string().min(3),
  materialsRequired: z.string().min(3),
  equipmentUsed: z.string().min(2),
  safetyObservations: z.string().min(3),
  issuesAndBlockers: z.string().optional(),
  tomorrowsPlan: z.string().min(5, 'Outline tomorrow planned activities'),
  supervisorRemarks: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function DailyReportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { ctx, project, site, offlineMode, enqueueSyncAction } = useAuthContext();
  const queryClient = useQueryClient();
  const [photos, setPhotos] = React.useState<string[]>([]);

  const { data: workers = [] } = useQuery({
    queryKey: ['crew', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => crewService.listAssignedWorkers(ctx),
    enabled: open,
  });

  const presentCount = workers.filter(
    (w) => w.attendanceStatus === 'Present' || w.attendanceStatus === 'Late'
  ).length;
  const absentCount = workers.filter((w) => w.attendanceStatus === 'Absent').length;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      date: '2026-11-18',
      shift: site.shiftTiming,
      totalAssignedWorkers: workers.length,
      presentWorkers: presentCount,
      absentWorkers: absentCount,
      workCompleted: '',
      tasksInProgress: '',
      tasksDelayed: '',
      materialsConsumed: '',
      materialsRequired: '',
      equipmentUsed: '',
      safetyObservations: 'Morning toolbox talk completed; PPE check done.',
      issuesAndBlockers: '',
      tomorrowsPlan: '',
      supervisorRemarks: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      setPhotos([]);
      reset({
        date: '2026-11-18',
        shift: site.shiftTiming,
        totalAssignedWorkers: workers.length,
        presentWorkers: presentCount,
        absentWorkers: absentCount,
        workCompleted: '',
        tasksInProgress: '',
        tasksDelayed: '',
        materialsConsumed: '',
        materialsRequired: '',
        equipmentUsed: 'Tower Crane, Concrete Pump, Needle Vibrator #1',
        safetyObservations: 'Morning toolbox talk completed; scaffold bay 4 cordoned off pending clamp fix.',
        issuesAndBlockers: '',
        tomorrowsPlan: '',
        supervisorRemarks: '',
      });
    }
  }, [open, site.shiftTiming, workers.length, presentCount, absentCount, reset]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const compressed = await compressImagePreview(file);
      setPhotos((prev) => [...prev, compressed.dataUrl]);
    }
    e.target.value = '';
  };

  const mutation = useMutation({
    mutationFn: ({ values, asDraft }: { values: FormValues; asDraft: boolean }) =>
      reportService.submitDailyReport(ctx, {
        ...values,
        tasksDelayed: values.tasksDelayed || 'None',
        issuesAndBlockers: values.issuesAndBlockers || 'None',
        supervisorRemarks: values.supervisorRemarks || '',
        photoUrls: photos,
        asDraft,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
      toast.success(
        created.status === 'Draft'
          ? 'Daily Site Report saved as draft.'
          : 'Daily Site Report submitted for Site Manager review.'
      );
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to submit report');
    },
  });

  const submitMode = (asDraft: boolean) =>
    handleSubmit((values) => {
      if (offlineMode && !asDraft) {
        enqueueSyncAction({
          idempotencyKey: `dsr-${values.date}-${ctx.siteId}`,
          actionType: 'DAILY_REPORT',
          title: `Daily Site Report (${values.date})`,
          payloadSummary: `${values.presentWorkers}/${values.totalAssignedWorkers} present`,
          executePayload: {
            ...values,
            tasksDelayed: values.tasksDelayed || 'None',
            issuesAndBlockers: values.issuesAndBlockers || 'None',
            supervisorRemarks: values.supervisorRemarks || '',
            photoUrls: photos,
            asDraft: false,
          },
        });
        toast.warning('Offline mode: Daily report queued locally for sync.');
        onClose();
        return;
      }
      mutation.mutate({ values, asDraft });
    })();

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title="Create Daily Site Report"
      subtitle={`${project.name} · ${site.name} · Manual verification required before submission`}
      maxWidthClass="max-w-3xl"
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="col-span-2 sm:col-span-2">
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Date & Shift
            </label>
            <input
              type="date"
              {...register('date')}
              className="w-full min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-xs font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Assigned
            </label>
            <input
              type="number"
              {...register('totalAssignedWorkers')}
              className="w-full min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-xs font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Present
            </label>
            <input
              type="number"
              {...register('presentWorkers')}
              className="w-full min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-xs font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Absent
            </label>
            <input
              type="number"
              {...register('absentWorkers')}
              className="w-full min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-xs font-mono-num"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Work Completed Today
            </label>
            <textarea
              rows={2}
              {...register('workCompleted')}
              placeholder="Quantities & zones completed..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.workCompleted && (
              <p className="text-xs text-[#DC2626] mt-1">{errors.workCompleted.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Tasks In Progress / Delayed
            </label>
            <textarea
              rows={2}
              {...register('tasksInProgress')}
              placeholder="Ongoing tasks and any delays..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Materials Consumed
            </label>
            <textarea
              rows={2}
              {...register('materialsConsumed')}
              placeholder="Cement bags, bricks, steel MT..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Materials Required Tomorrow
            </label>
            <textarea
              rows={2}
              {...register('materialsRequired')}
              placeholder="List material needs for next shift..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Equipment Used & Safety Observations
            </label>
            <textarea
              rows={2}
              {...register('safetyObservations')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Tomorrow's Planned Activities
            </label>
            <textarea
              rows={2}
              {...register('tomorrowsPlan')}
              placeholder="Planned zones, crew deployment..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.tomorrowsPlan && (
              <p className="text-xs text-[#DC2626] mt-1">{errors.tomorrowsPlan.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#172B4D] hover:bg-slate-50 cursor-pointer">
            <Camera className="w-4 h-4 text-[#2563EB]" />
            <span>Attach Site Progress Photos</span>
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
                  <img src={url} alt="Site report" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
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
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => submitMode(true)}
          >
            Save Draft
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => submitMode(false)}
          >
            {mutation.isPending ? 'Submitting...' : 'Submit Daily Report'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
