import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ResponsiveModal } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { crewService } from '@/src/services/crewService';
import type { WorkerCategory } from '@/src/types/models';
import { toast } from 'sonner';

const WORKER_CATEGORIES: WorkerCategory[] = [
  'Mason',
  'Helper',
  'Carpenter',
  'Electrician',
  'Plumber',
  'Welder',
  'Painter',
  'Steel Fixer',
  'Machine Operator',
  'Driver',
  'General Labour',
];

const schema = z.object({
  name: z.string().min(2, 'Worker full name is required'),
  employeeId: z.string().min(3, 'Employee / Badge ID is required'),
  designation: z.string().min(1),
  skillCategory: z.enum(['Skilled', 'Unskilled']),
  employmentType: z.enum(['Company Payroll', 'Contractor']),
  contractorName: z.string().optional(),
  phone: z.string().min(8, 'Valid mobile number required'),
  requestApprovalReason: z.string().min(4, 'Provide reason for crew addition'),
});

type FormValues = z.infer<typeof schema>;

export function AddWorkerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { ctx, user } = useAuthContext();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      employeeId: `GV-EMP-${Math.floor(200 + Math.random() * 700)}`,
      designation: 'Mason',
      skillCategory: 'Skilled',
      employmentType: 'Company Payroll',
      contractorName: '',
      phone: '+91 ',
      requestApprovalReason: 'Additional manpower for Tower A ground floor brickwork',
    },
  });

  const empType = watch('employmentType');

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      crewService.addOrRequestWorkerToCrew(ctx, {
        name: values.name,
        employeeId: values.employeeId,
        designation: values.designation as WorkerCategory,
        skillCategory: values.skillCategory,
        employmentType: values.employmentType,
        contractorName: values.contractorName,
        phone: values.phone,
        requestApprovalReason: values.requestApprovalReason,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['crew'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(`${res.worker.name} — ${res.approvalMode}`);
      reset();
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to add worker');
    },
  });

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title={
        user.effectivePermissions.manage_crew_reassignment
          ? 'Assign Worker to Crew'
          : 'Request Additional Worker for Crew'
      }
      subtitle="Historical crew assignments are preserved. Workers are never silently transferred between supervisors."
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Worker Name
            </label>
            <input
              {...register('name')}
              placeholder="Full name"
              className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-sm"
            />
            {errors.name && (
              <p className="text-xs text-[#DC2626] mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Employee / Badge ID
            </label>
            <input
              {...register('employeeId')}
              className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-sm font-mono-num"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Trade / Designation
            </label>
            <select
              {...register('designation')}
              className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              {WORKER_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Skill Category
            </label>
            <select
              {...register('skillCategory')}
              className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="Skilled">Skilled</option>
              <option value="Unskilled">Unskilled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Employment Type
            </label>
            <select
              {...register('employmentType')}
              className="w-full min-h-[42px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="Company Payroll">Company Payroll</option>
              <option value="Contractor">Contractor</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Contact Phone
            </label>
            <input
              {...register('phone')}
              className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-sm font-mono-num"
            />
            {errors.phone && (
              <p className="text-xs text-[#DC2626] mt-1">{errors.phone.message}</p>
            )}
          </div>

          {empType === 'Contractor' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#101F35] mb-1">
                Contractor Agency Name
              </label>
              <input
                {...register('contractorName')}
                placeholder="e.g., Metro Masonry Contractors"
                className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Assignment Justification
            </label>
            <input
              {...register('requestApprovalReason')}
              className="w-full min-h-[42px] rounded-lg border border-slate-300 px-3 text-sm"
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-[#64748B]">
          {user.effectivePermissions.manage_crew_reassignment
            ? 'Direct crew assignment enabled for your role.'
            : 'Requires Site Manager approval before worker transfer is finalized.'}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? 'Processing...'
              : user.effectivePermissions.manage_crew_reassignment
              ? 'Assign Worker'
              : 'Submit Crew Request'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
