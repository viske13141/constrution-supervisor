import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ResponsiveModal } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { attendanceService } from '@/src/services/attendanceService';
import type { WorkerAttendanceStatus } from '@/src/types/models';
import { toast } from 'sonner';

const schema = z.object({
  attendanceId: z.string().min(1, 'Select a crew member'),
  requestedStatus: z.enum([
    'Present',
    'Absent',
    'Late',
    'On Leave',
    'Not Checked In',
    'Missing Checkout',
  ]),
  reason: z.string().min(3, 'Select or enter a reason'),
  remarks: z.string().min(4, 'Add brief field remarks (min 4 characters)'),
});

type FormValues = z.infer<typeof schema>;

export function AttendanceExceptionModal({
  open,
  onClose,
  initialAttendanceId,
}: {
  open: boolean;
  onClose: () => void;
  initialAttendanceId?: string;
}) {
  const { ctx, user, offlineMode, enqueueSyncAction } = useAuthContext();
  const queryClient = useQueryClient();

  const { data: records = [] } = useQuery({
    queryKey: ['attendance', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => attendanceService.listAttendance(ctx),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      attendanceId: initialAttendanceId || '',
      requestedStatus: 'Present',
      reason: 'Observed on site — device/network issue',
      remarks: '',
    },
  });

  React.useEffect(() => {
    if (open) {
      const defaultRec =
        records.find((r) => r.id === initialAttendanceId) ||
        records.find((r) => r.pendingReview) ||
        records[0];
      reset({
        attendanceId: defaultRec?.id || '',
        requestedStatus: 'Present',
        reason: 'Observed on site — device/network issue',
        remarks: '',
      });
    }
  }, [open, initialAttendanceId, records, reset]);

  const selectedId = watch('attendanceId');
  const selectedRec = records.find((r) => r.id === selectedId);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      attendanceService.submitAttendanceException(ctx, {
        attendanceId: values.attendanceId,
        requestedStatus: values.requestedStatus as WorkerAttendanceStatus,
        reason: values.reason,
        remarks: values.remarks,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['crew'] });
      toast.success(
        user.effectivePermissions.verify_attendance_directly
          ? `Attendance updated for ${updated.workerName} (Verified by policy)`
          : `Correction submitted for ${updated.workerName} — pending Site Manager review`
      );
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Unable to save exception');
    },
  });

  const onSubmit = (values: FormValues) => {
    if (offlineMode) {
      enqueueSyncAction({
        idempotencyKey: `att-exc-${values.attendanceId}-${values.requestedStatus}`,
        actionType: 'ATTENDANCE_EXCEPTION',
        title: `Attendance exception for ${selectedRec?.workerName || 'Worker'}`,
        payloadSummary: `${values.requestedStatus} · ${values.reason}`,
        executePayload: values,
      });
      toast.warning('Offline mode: Attendance exception queued locally for sync.');
      onClose();
      return;
    }
    mutation.mutate(values);
  };

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title="Mark Attendance Exception / Review"
      subtitle="Original GPS, selfie photo, and timestamp records remain preserved in audit history."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#101F35] mb-1">
            Crew Member
          </label>
          <select
            {...register('attendanceId')}
            className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          >
            <option value="">Select worker...</option>
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {r.workerName} ({r.employeeId}) — {r.status}
                {r.pendingReview ? ' [Review Needed]' : ''}
              </option>
            ))}
          </select>
          {errors.attendanceId && (
            <p className="text-xs text-[#DC2626] mt-1">{errors.attendanceId.message}</p>
          )}
        </div>

        {selectedRec && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-[#101F35]">
                Original Telemetry (Immutable)
              </span>
              <StatusIndicator label={selectedRec.originalStatus} />
            </div>
            <div className="text-[#64748B] flex flex-wrap gap-x-3 gap-y-1">
              <span>Check-in: {selectedRec.checkInTime || 'None'}</span>
              <span>· Photo: {selectedRec.checkInPhotoStatus}</span>
              <span>· GPS: {selectedRec.gpsVerificationStatus}</span>
              <span>· Geofence: {selectedRec.geofenceStatus}</span>
            </div>
            {selectedRec.exceptionReason && (
              <div className="text-amber-800 pt-1">
                Note: {selectedRec.exceptionReason}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Requested Attendance Status
            </label>
            <select
              {...register('requestedStatus')}
              className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
              <option value="On Leave">On Leave</option>
              <option value="Missing Checkout">Missing Checkout</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Exception Reason
            </label>
            <select
              {...register('reason')}
              className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="Observed on site — device/network issue">
                Observed on site — device/network issue
              </option>
              <option value="Basement / low-GPS zone check-in">
                Basement / low-GPS zone check-in
              </option>
              <option value="Forgot evening checkout at gate">
                Forgot evening checkout at gate
              </option>
              <option value="Approved transport / shift delay">
                Approved transport / shift delay
              </option>
              <option value="Unplanned absence / no-show">
                Unplanned absence / no-show
              </option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#101F35] mb-1">
            Supervisor Remarks
          </label>
          <textarea
            rows={3}
            {...register('remarks')}
            placeholder="Describe where worker was observed or reason for attendance correction..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
          {errors.remarks && (
            <p className="text-xs text-[#DC2626] mt-1">{errors.remarks.message}</p>
          )}
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          {user.effectivePermissions.verify_attendance_directly
            ? 'Company policy allows direct verification by your role. Original GPS/photo flags will not be forged.'
            : 'Company policy requires Site Manager/HR approval. Your correction will be queued for review while keeping original logs.'}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? 'Submitting...'
              : user.effectivePermissions.verify_attendance_directly
              ? 'Save & Verify Exception'
              : 'Submit for Manager Review'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
