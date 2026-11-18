import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, UserPlus } from 'lucide-react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/button';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { TaskCreateModal } from '@/src/components/modals/TaskCreateModal';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { crewService } from '@/src/services/crewService';
import type { WorkerAvailabilityStatus } from '@/src/types/models';

const AVAILABILITY_GROUPS: WorkerAvailabilityStatus[] = [
  'Available',
  'Currently Working',
  'Assigned to Another Task',
  'Temporarily Unavailable',
  'On Leave',
  'Absent',
];

export function AvailabilityPage() {
  const { ctx, site } = useAuthContext();
  const [filterStatus, setFilterStatus] = React.useState<string>('All');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);

  const { data: workers = [] } = useQuery({
    queryKey: ['crew', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => crewService.listAssignedWorkers(ctx),
  });

  const filtered = workers.filter(
    (w) => filterStatus === 'All' || w.availabilityStatus === filterStatus
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const conflictSelected = workers.filter(
    (w) =>
      selectedIds.includes(w.id) &&
      (w.availabilityStatus === 'Currently Working' ||
        w.availabilityStatus === 'Assigned to Another Task')
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Worker Availability & Assignment Matrix"
        metadata={[site.name, 'Prevents accidental double-assignment across overlapping tasks']}
        actions={
          <Button
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={() => setAssignModalOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            Assign Selected ({selectedIds.length})
          </Button>
        }
      />

      {/* Availability Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {AVAILABILITY_GROUPS.map((status) => {
          const count = workers.filter((w) => w.availabilityStatus === status).length;
          const active = filterStatus === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(active ? 'All' : status)}
              className={`text-left rounded-xl border p-3 transition-colors cursor-pointer ${
                active
                  ? 'border-[#2563EB] bg-blue-50/70'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="text-[11px] text-[#64748B] truncate">{status}</div>
              <div className="mt-1 text-xl font-bold font-mono-num text-[#101F35]">
                {count}
              </div>
            </button>
          );
        })}
      </div>

      {conflictSelected.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Scheduling Conflict Alert: </span>
            {conflictSelected.map((w) => `${w.name} (${w.currentTaskTitle || w.availabilityStatus})`).join(', ')} already assigned. Confirm crew handover before creating overlapping tasks.
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-[#64748B]">
          <span>
            Showing {filtered.length} worker(s) · Approved leave & HR status are read-only
          </span>
          {filterStatus !== 'All' && (
            <button
              type="button"
              onClick={() => setFilterStatus('All')}
              className="font-semibold text-[#2563EB] hover:underline cursor-pointer"
            >
              Show All
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map((w) => {
            const locked =
              w.availabilityStatus === 'On Leave' || w.availabilityStatus === 'Absent';
            const checked = selectedIds.includes(w.id);
            return (
              <label
                key={w.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 ${
                  locked ? 'opacity-65 bg-slate-50/40' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    disabled={locked}
                    checked={checked}
                    onChange={() => toggleSelect(w.id)}
                    className="h-4 w-4 rounded border-slate-300 text-[#2563EB] shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#101F35] truncate">
                      {w.name} · {w.designation}
                    </div>
                    <div className="text-xs text-[#64748B] truncate">
                      <span className="font-mono-num">{w.employeeId}</span> ·{' '}
                      {w.currentTaskTitle
                        ? `Current: ${w.currentTaskTitle}`
                        : 'Ready for allocation'}
                    </div>
                  </div>
                </div>
                <StatusIndicator label={w.availabilityStatus} />
              </label>
            );
          })}
        </div>
      </div>

      <TaskCreateModal
        open={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedIds([]);
        }}
        preselectedWorkerIds={selectedIds}
      />
    </div>
  );
}
