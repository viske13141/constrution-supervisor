import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardEdit, Search } from 'lucide-react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/button';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { AttendanceExceptionModal } from '@/src/components/modals/AttendanceExceptionModal';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { attendanceService } from '@/src/services/attendanceService';

export function AttendancePage() {
  const { ctx, site, user } = useAuthContext();
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('All');
  const [dateRange, setDateRange] = React.useState<'Today' | 'Yesterday' | 'This Week'>('Today');
  const [selectedAttId, setSelectedAttId] = React.useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = React.useState(false);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendance', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => attendanceService.listAttendance(ctx),
  });

  const filtered = records.filter((r) => {
    const q = search.trim().toLowerCase();
    if (
      q &&
      !r.workerName.toLowerCase().includes(q) &&
      !r.employeeId.toLowerCase().includes(q)
    ) {
      return false;
    }
    if (statusFilter === 'Pending Review') return r.pendingReview;
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    return true;
  });

  const openException = (attId: string) => {
    setSelectedAttId(attId);
    setModalOpen(true);
  };

  const counts = {
    total: records.length,
    checkedIn: records.filter((r) => r.checkInTime !== null).length,
    notCheckedIn: records.filter((r) => r.status === 'Not Checked In').length,
    absent: records.filter((r) => r.status === 'Absent').length,
    late: records.filter((r) => r.status === 'Late').length,
    missingCheckout: records.filter((r) => r.status === 'Missing Checkout').length,
    exceptions: records.filter((r) => r.pendingReview || r.exceptions.length > 0).length,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Crew Attendance Management"
        metadata={[
          site.name,
          `${dateRange} (2026-11-18)`,
          user.effectivePermissions.verify_attendance_directly
            ? 'Direct Verification Enabled'
            : 'Corrections Route to Site Manager',
        ]}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setSelectedAttId(records.find((r) => r.pendingReview)?.id);
              setModalOpen(true);
            }}
          >
            <ClipboardEdit className="w-4 h-4" />
            Record Exception
          </Button>
        }
      />

      {/* Overview Metrics */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
        {[
          { label: 'Assigned', val: counts.total },
          { label: 'Checked In', val: counts.checkedIn },
          { label: 'Not Checked In', val: counts.notCheckedIn },
          { label: 'Absent', val: counts.absent },
          { label: 'Late', val: counts.late },
          { label: 'Exceptions', val: counts.exceptions },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
          >
            <div className="text-[11px] text-[#64748B] truncate">{c.label}</div>
            <div className="text-xl font-bold font-mono-num text-[#101F35]">
              {c.val}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search worker name or employee ID..."
              className="w-full min-h-[40px] rounded-lg border border-slate-300 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            aria-label="Date range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="Today">Today (18 Nov 2026)</option>
            <option value="Yesterday">Yesterday (17 Nov 2026)</option>
            <option value="This Week">This Week</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['All', 'Pending Review', 'Present', 'Late', 'Absent', 'Not Checked In', 'Missing Checkout'].map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#101F35] text-white'
                    : 'bg-slate-100 text-[#64748B] hover:text-[#101F35]'
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {/* Desktop Attendance Table */}
      <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs text-[#64748B]">
                <th className="py-3 px-4 font-semibold">Worker</th>
                <th className="py-3 px-3 font-semibold">Check-In</th>
                <th className="py-3 px-3 font-semibold">Photo</th>
                <th className="py-3 px-3 font-semibold">GPS / Geofence</th>
                <th className="py-3 px-3 font-semibold">Check-Out</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-[#64748B]">
                    Loading attendance records...
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#101F35]">{r.workerName}</div>
                      <div className="text-xs font-mono-num text-[#64748B]">{r.employeeId}</div>
                      {r.exceptionReason && (
                        <div className="text-[11px] text-amber-800 mt-0.5 max-w-[260px] truncate">
                          {r.exceptionReason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono-num">
                      {r.checkInTime || '—'}
                    </td>
                    <td className="py-3 px-3 text-xs text-[#64748B]">
                      {r.checkInPhotoStatus}
                    </td>
                    <td className="py-3 px-3 text-xs">
                      <div className="font-medium text-[#172B4D]">{r.gpsVerificationStatus}</div>
                      <div className="text-[#64748B]">{r.geofenceStatus}</div>
                    </td>
                    <td className="py-3 px-3 font-mono-num">
                      {r.checkOutTime || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col items-start gap-1">
                        <StatusIndicator label={r.status} />
                        {r.pendingReview && (
                          <span className="text-[11px] font-medium text-[#D97706]">
                            Review Required
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant={r.pendingReview ? 'amber' : 'outline'}
                        onClick={() => openException(r.id)}
                      >
                        {r.pendingReview ? 'Review' : 'Exception'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile One-Handed Quick Review List */}
      <div className="md:hidden space-y-2.5">
        {filtered.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#101F35] truncate">
                  {r.workerName}
                </div>
                <div className="text-xs font-mono-num text-[#64748B]">
                  {r.employeeId} · In: {r.checkInTime || 'None'}
                </div>
              </div>
              <StatusIndicator label={r.status} />
            </div>
            {r.exceptionReason && (
              <div className="text-xs text-amber-800 bg-amber-50 rounded-md px-2.5 py-1.5">
                {r.exceptionReason}
              </div>
            )}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-[#64748B]">
                GPS: {r.gpsVerificationStatus}
              </span>
              <Button
                size="sm"
                variant={r.pendingReview ? 'amber' : 'outline'}
                onClick={() => openException(r.id)}
              >
                {r.pendingReview ? 'Quick Review' : 'Exception'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AttendanceExceptionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialAttendanceId={selectedAttId}
      />
    </div>
  );
}
