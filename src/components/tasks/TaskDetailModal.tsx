import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, MessageSquare, Users } from 'lucide-react';
import { ResponsiveModal } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { SafeImage } from '@/src/components/shared/SafeImage';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { taskService } from '@/src/services/taskService';
import { compressImagePreview } from '@/src/lib/utils';
import type { Task, TaskStatus } from '@/src/types/models';
import { toast } from 'sonner';

export function TaskDetailModal({
  task,
  onClose,
}: {
  task: Task | null;
  onClose: () => void;
}) {
  const { ctx, user, offlineMode, enqueueSyncAction } = useAuthContext();
  const queryClient = useQueryClient();

  const [progressPercent, setProgressPercent] = React.useState(0);
  const [status, setStatus] = React.useState<TaskStatus>('In Progress');
  const [summary, setSummary] = React.useState('');
  const [delayReason, setDelayReason] = React.useState('');
  const [materialShortage, setMaterialShortage] = React.useState('');
  const [equipmentIssue, setEquipmentIssue] = React.useState('');
  const [photos, setPhotos] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (task) {
      setProgressPercent(task.progressPercent);
      setStatus(task.status);
      setSummary('');
      setDelayReason('');
      setMaterialShortage('');
      setEquipmentIssue('');
      setPhotos([]);
    }
  }, [task]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!task) throw new Error('No task selected');
      return taskService.updateTaskProgress(ctx, {
        taskId: task.id,
        progressPercent,
        status,
        workCompletedSummary: summary || `Updated progress to ${progressPercent}%`,
        delayReason: delayReason || undefined,
        materialShortage: materialShortage || undefined,
        equipmentIssue: equipmentIssue || undefined,
        photoUrls: photos,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Task "${updated.title}" updated (${updated.status} · ${updated.progressPercent}%).`);
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Unable to update task');
    },
  });

  if (!task) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const compressed = await compressImagePreview(file);
      setPhotos((prev) => [...prev, compressed.dataUrl]);
    }
    e.target.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (offlineMode) {
      enqueueSyncAction({
        idempotencyKey: `task-prog-${task.id}-${progressPercent}-${status}`,
        actionType: 'TASK_PROGRESS',
        title: `Task Progress: ${task.title}`,
        payloadSummary: `${progressPercent}% · ${status}`,
        executePayload: {
          taskId: task.id,
          progressPercent,
          status,
          workCompletedSummary: summary || `Updated progress to ${progressPercent}%`,
          delayReason: delayReason || undefined,
          materialShortage: materialShortage || undefined,
          equipmentIssue: equipmentIssue || undefined,
          photoUrls: photos,
        },
      });
      toast.warning('Offline mode: Task progress queued locally for sync.');
      onClose();
      return;
    }
    mutation.mutate();
  };

  const allPhotos = [...task.beforeImages, ...task.progressImages, ...task.completionImages];

  return (
    <ResponsiveModal
      open={Boolean(task)}
      onClose={onClose}
      title={task.title}
      subtitle={`${task.workZone} · ${task.workCategory} · Due ${task.dueDate}`}
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIndicator label={task.status} />
            <StatusIndicator label={task.priority} />
          </div>
          <span className="font-mono-num text-sm font-bold text-[#101F35]">
            {task.progressPercent}% Complete
          </span>
        </div>

        <p className="text-sm text-[#172B4D] leading-relaxed">{task.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-slate-200 p-3 space-y-1.5">
            <div className="font-semibold text-[#101F35]">Execution Details</div>
            <div className="text-[#64748B]">Start: <span className="font-mono-num text-[#172B4D]">{task.startDate}</span> · Planned: <span className="font-mono-num text-[#172B4D]">{task.plannedHours}h</span></div>
            {task.completedUnitsText && (
              <div className="text-[#16A34A] font-medium">{task.completedUnitsText}</div>
            )}
            {task.remainingUnitsText && (
              <div className="text-[#64748B]">Remaining: {task.remainingUnitsText}</div>
            )}
            <div className="pt-1 text-[#172B4D]">
              <span className="font-semibold">Instructions:</span> {task.instructions}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 space-y-1.5">
            <div className="font-semibold text-[#101F35] flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Assigned Workers ({task.assignments.length})</span>
            </div>
            {task.assignments.length === 0 ? (
              <div className="text-[#64748B]">No workers assigned yet.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {task.assignments.map((a) => (
                  <span
                    key={a.id}
                    className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-[#172B4D]"
                  >
                    {a.workerName} · {a.designation}
                  </span>
                ))}
              </div>
            )}
            {task.requiredMaterials.length > 0 && (
              <div className="pt-1.5 border-t border-slate-100">
                <span className="font-semibold text-[#101F35]">Materials: </span>
                <span className="text-[#64748B]">{task.requiredMaterials.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {(task.supervisorRemarks || task.siteManagerComments) && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
            {task.supervisorRemarks && (
              <div>
                <span className="font-semibold text-[#101F35]">Supervisor Remarks: </span>
                <span>{task.supervisorRemarks}</span>
              </div>
            )}
            {task.siteManagerComments && (
              <div className="flex items-start gap-1.5 text-[#2563EB]">
                <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Site Manager Comment: </span>
                  <span>{task.siteManagerComments}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {allPhotos.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-[#101F35]">Field Progress Photos</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allPhotos.map((src, i) => (
                <SafeImage
                  key={i}
                  src={src}
                  alt={`${task.title} photo ${i + 1}`}
                  className="w-full h-28 rounded-lg border border-slate-200"
                />
              ))}
            </div>
          </div>
        )}

        {/* Update Progress Form */}
        <form onSubmit={handleSave} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
          <div className="text-sm font-semibold text-[#101F35]">
            Log Progress / Report Issue
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#101F35] mb-1">
                Completion Progress (<span className="font-mono-num">{progressPercent}%</span>)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progressPercent}
                onChange={(e) => setProgressPercent(Number(e.target.value))}
                className="w-full accent-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#101F35] mb-1">
                Task Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 text-sm"
              >
                <option value="Assigned">Assigned</option>
                <option value="Accepted">Accepted</option>
                <option value="In Progress">In Progress</option>
                <option value="Blocked">Blocked</option>
                <option value="Submitted for Review">Submit for Site Manager Review</option>
                {user.effectivePermissions.approve_completed_tasks && (
                  <option value="Approved">Approved (Site Manager)</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Work Completed Today
            </label>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g., Tied remaining 2 column cages, ready for shuttering..."
              className="w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
              placeholder="Delay reason (optional)"
              className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs"
            />
            <input
              value={materialShortage}
              onChange={(e) => setMaterialShortage(e.target.value)}
              placeholder="Material shortage (optional)"
              className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs"
            />
            <input
              value={equipmentIssue}
              onChange={(e) => setEquipmentIssue(e.target.value)}
              placeholder="Equipment issue (optional)"
              className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <label className="inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-[#172B4D] hover:bg-slate-50 cursor-pointer">
              <Camera className="w-4 h-4 text-[#2563EB]" />
              <span>Add Progress Photo ({photos.length})</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button type="submit" size="sm" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : 'Save Progress Update'}
              </Button>
            </div>
          </div>

          {!user.effectivePermissions.approve_completed_tasks && (
            <p className="text-[11px] text-[#64748B]">
              Marking a task complete submits it for Site Manager review; it does not auto-approve.
            </p>
          )}
        </form>
      </div>
    </ResponsiveModal>
  );
}
