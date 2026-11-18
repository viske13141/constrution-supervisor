import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Camera, Trash2 } from 'lucide-react';
import { ResponsiveModal } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { crewService } from '@/src/services/crewService';
import { taskService } from '@/src/services/taskService';
import { compressImagePreview } from '@/src/lib/utils';
import { toast } from 'sonner';

const schema = z.object({
  title: z.string().min(3, 'Task title is required'),
  description: z.string().min(6, 'Provide clear task scope'),
  workZone: z.string().min(2, 'Specify work zone or floor'),
  workCategory: z.string().min(2),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
  startDate: z.string().min(1),
  dueDate: z.string().min(1),
  plannedHours: z.coerce.number().min(1).max(200),
  requiredMaterialsText: z.string().optional(),
  instructions: z.string().min(4, 'Add execution instructions'),
  supervisorRemarks: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function TaskCreateModal({
  open,
  onClose,
  preselectedWorkerIds = [],
}: {
  open: boolean;
  onClose: () => void;
  preselectedWorkerIds?: string[];
}) {
  const { ctx, project, site } = useAuthContext();
  const queryClient = useQueryClient();
  const [selectedWorkers, setSelectedWorkers] = React.useState<string[]>(preselectedWorkerIds);
  const [images, setImages] = React.useState<Array<{ name: string; url: string; info: string }>>([]);

  const { data: workers = [] } = useQuery({
    queryKey: ['crew', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => crewService.listAssignedWorkers(ctx),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      title: '',
      description: '',
      workZone: `${site.name} – Ground Floor`,
      workCategory: 'Masonry',
      priority: 'High',
      startDate: '2026-11-18',
      dueDate: '2026-11-20',
      plannedHours: 8,
      requiredMaterialsText: '',
      instructions: '',
      supervisorRemarks: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      setSelectedWorkers(preselectedWorkerIds);
      setImages([]);
      reset({
        title: '',
        description: '',
        workZone: `${site.name} – Ground Floor`,
        workCategory: 'Masonry',
        priority: 'High',
        startDate: '2026-11-18',
        dueDate: '2026-11-20',
        plannedHours: 8,
        requiredMaterialsText: '',
        instructions: '',
        supervisorRemarks: '',
      });
    }
  }, [open, preselectedWorkerIds, site.name, reset]);

  const conflictingWorkers = workers.filter(
    (w) =>
      selectedWorkers.includes(w.id) &&
      (w.availabilityStatus === 'Currently Working' ||
        w.availabilityStatus === 'Assigned to Another Task' ||
        w.availabilityStatus === 'On Leave' ||
        w.availabilityStatus === 'Absent')
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const compressed = await compressImagePreview(file);
      setImages((prev) => [
        ...prev,
        {
          name: compressed.name,
          url: compressed.dataUrl,
          info: `${Math.round(compressed.compressedBytes / 1024)} KB compressed`,
        },
      ]);
    }
    e.target.value = '';
  };

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      taskService.createTask(ctx, {
        title: values.title,
        description: values.description,
        workZone: values.workZone,
        workCategory: values.workCategory,
        priority: values.priority,
        startDate: values.startDate,
        dueDate: values.dueDate,
        plannedHours: values.plannedHours,
        requiredMaterials: (values.requiredMaterialsText || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        instructions: values.instructions,
        supervisorRemarks: values.supervisorRemarks,
        workerIds: selectedWorkers,
        referenceImages: images.map((i) => i.url),
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['crew'] });
      toast.success(`Task "${created.title}" assigned to ${created.assignments.length} worker(s).`);
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Unable to create task');
    },
  });

  const toggleWorker = (id: string) => {
    setSelectedWorkers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title="Allocate Daily Work Task"
      subtitle={`${project.name} · ${site.name}`}
      maxWidthClass="max-w-3xl"
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Task Title
            </label>
            <input
              {...register('title')}
              placeholder="e.g., Ground Floor Brickwork – East Bay"
              className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
            {errors.title && (
              <p className="text-xs text-[#DC2626] mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Work Zone / Floor
            </label>
            <input
              {...register('workZone')}
              className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#101F35] mb-1">
                Category
              </label>
              <select
                {...register('workCategory')}
                className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-2.5 text-sm"
              >
                <option value="Masonry">Masonry</option>
                <option value="Structural Steel">Structural Steel</option>
                <option value="Concreting">Concreting</option>
                <option value="Formwork">Formwork</option>
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Finishing">Finishing</option>
                <option value="Logistics">Logistics</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#101F35] mb-1">
                Priority
              </label>
              <select
                {...register('priority')}
                className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-2.5 text-sm"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Task Description
            </label>
            <textarea
              rows={2}
              {...register('description')}
              placeholder="Scope, grid lines, or target quantity..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
            {errors.description && (
              <p className="text-xs text-[#DC2626] mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Start Date
            </label>
            <input
              type="date"
              {...register('startDate')}
              className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-sm font-mono-num"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#101F35] mb-1">
                Expected Completion
              </label>
              <input
                type="date"
                {...register('dueDate')}
                className="w-full min-h-[42px] rounded-lg border border-slate-300 px-2.5 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#101F35] mb-1">
                Planned Hrs
              </label>
              <input
                type="number"
                {...register('plannedHours')}
                className="w-full min-h-[42px] rounded-lg border border-slate-300 px-2.5 text-sm font-mono-num"
              />
            </div>
          </div>
        </div>

        {/* Worker Selection with Conflict Detection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#101F35]">
              Assign Crew Members ({selectedWorkers.length} selected)
            </label>
            <span className="text-xs text-[#64748B]">
              Available workers shown first
            </span>
          </div>

          {conflictingWorkers.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Scheduling Conflict Warning: </span>
                {conflictingWorkers
                  .map((w) => `${w.name} (${w.availabilityStatus})`)
                  .join(', ')}
                . Verify handover before double-assigning.
              </div>
            </div>
          )}

          <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
            {[...workers]
              .sort((a, b) =>
                a.availabilityStatus === 'Available' && b.availabilityStatus !== 'Available'
                  ? -1
                  : 1
              )
              .map((w) => {
                const checked = selectedWorkers.includes(w.id);
                const disabledByLeave =
                  w.availabilityStatus === 'On Leave' || w.availabilityStatus === 'Absent';
                return (
                  <label
                    key={w.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 ${
                      disabledByLeave ? 'opacity-60 bg-slate-50/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabledByLeave}
                        onChange={() => toggleWorker(w.id)}
                        className="h-4 w-4 rounded border-slate-300 text-[#2563EB]"
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-[#172B4D] truncate">
                          {w.name} · {w.designation}
                        </div>
                        <div className="text-[11px] text-[#64748B] truncate">
                          {w.currentTaskTitle
                            ? `Active: ${w.currentTaskTitle}`
                            : 'No active task'}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 font-medium ${
                        w.availabilityStatus === 'Available'
                          ? 'text-[#16A34A]'
                          : w.availabilityStatus === 'Absent' || w.availabilityStatus === 'On Leave'
                          ? 'text-[#DC2626]'
                          : 'text-[#B45309]'
                      }`}
                    >
                      {w.availabilityStatus}
                    </span>
                  </label>
                );
              })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Required Materials (comma separated)
            </label>
            <input
              {...register('requiredMaterialsText')}
              placeholder="e.g., Red Bricks (3000), OPC Cement (25 bags)"
              className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Site Instructions & Safety Notes
            </label>
            <input
              {...register('instructions')}
              placeholder="Quality tolerance, PPE, or drawing ref..."
              className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-sm"
            />
            {errors.instructions && (
              <p className="text-xs text-[#DC2626] mt-1">{errors.instructions.message}</p>
            )}
          </div>
        </div>

        {/* Camera / Reference Photo Upload with Compression */}
        <div>
          <label className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#172B4D] hover:bg-slate-50 cursor-pointer">
            <Camera className="w-4 h-4 text-[#2563EB]" />
            <span>Attach Reference Photo / Drawing (Auto-compressed)</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {images.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs"
                >
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-10 h-10 rounded object-cover"
                  />
                  <div>
                    <div className="font-medium max-w-[140px] truncate">{img.name}</div>
                    <div className="text-[11px] text-[#64748B]">{img.info}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-1 text-slate-400 hover:text-[#DC2626] cursor-pointer"
                    aria-label="Remove attachment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating Task...' : 'Assign Task'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
