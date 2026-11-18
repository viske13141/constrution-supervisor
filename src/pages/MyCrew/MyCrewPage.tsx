import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserPlus } from 'lucide-react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/button';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { WorkerProfileModal } from '@/src/components/crew/WorkerProfileModal';
import { AddWorkerModal } from '@/src/components/modals/AddWorkerModal';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { crewService } from '@/src/services/crewService';
import { attendanceService } from '@/src/services/attendanceService';
import { taskService } from '@/src/services/taskService';
import type { Worker } from '@/src/types/models';

const PAGE_SIZE = 12;

export function MyCrewPage() {
  const { ctx, user, site } = useAuthContext();
  const [search, setSearch] = React.useState('');
  const [filterMode, setFilterMode] = React.useState<string>('All');
  const [tradeFilter, setTradeFilter] = React.useState<string>('All Trades');
  const [sortBy, setSortBy] = React.useState<'name' | 'status' | 'trade'>('name');
  const [page, setPage] = React.useState(1);
  const [selectedWorker, setSelectedWorker] = React.useState<Worker | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ['crew', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => crewService.listAssignedWorkers(ctx),
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => attendanceService.listAttendance(ctx),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => taskService.listTasks(ctx),
  });

  const trades = Array.from(new Set(workers.map((w) => w.designation)));

  const filtered = workers
    .filter((w) => {
      const q = search.trim().toLowerCase();
      if (
        q &&
        !w.name.toLowerCase().includes(q) &&
        !w.employeeId.toLowerCase().includes(q) &&
        !w.designation.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (tradeFilter !== 'All Trades' && w.designation !== tradeFilter) return false;
      if (filterMode === 'Present' && w.attendanceStatus !== 'Present') return false;
      if (filterMode === 'Absent' && w.attendanceStatus !== 'Absent') return false;
      if (filterMode === 'Late' && w.attendanceStatus !== 'Late') return false;
      if (filterMode === 'On Leave' && w.attendanceStatus !== 'On Leave') return false;
      if (
        filterMode === 'Not Checked In' &&
        w.attendanceStatus !== 'Not Checked In' &&
        w.attendanceStatus !== 'Missing Checkout'
      ) {
        return false;
      }
      if (filterMode === 'Skilled' && w.skillCategory !== 'Skilled') return false;
      if (filterMode === 'Unskilled' && w.skillCategory !== 'Unskilled') return false;
      if (filterMode === 'Contractors' && w.employmentType !== 'Contractor') return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'trade') return a.designation.localeCompare(b.designation);
      if (sortBy === 'status') return a.attendanceStatus.localeCompare(b.attendanceStatus);
      return a.name.localeCompare(b.name);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  React.useEffect(() => {
    setPage(1);
  }, [search, filterMode, tradeFilter]);

  const filterChips = [
    'All',
    'Present',
    'Absent',
    'Late',
    'Not Checked In',
    'Skilled',
    'Unskilled',
    'Contractors',
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Crew Directory"
        metadata={[site.name, `${workers.length} assigned workers`, `Supervisor: ${user.name}`]}
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="w-4 h-4" />
            {user.effectivePermissions.manage_crew_reassignment
              ? 'Add Worker to Crew'
              : 'Request Worker'}
          </Button>
        }
      />

      {/* Search & Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search worker name, ID, or trade..."
              className="w-full min-h-[40px] rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>

          <select
            aria-label="Filter by trade"
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value)}
            className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="All Trades">All Trades</option>
            {trades.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort workers"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'status' | 'trade')}
            className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="name">Sort: Name</option>
            <option value="trade">Sort: Trade</option>
            <option value="status">Sort: Attendance</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {filterChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setFilterMode(chip)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                filterMode === chip
                  ? 'bg-[#101F35] text-white'
                  : 'bg-slate-100 text-[#64748B] hover:text-[#101F35]'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Crew Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-36 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-2">
          <div className="text-sm font-semibold text-[#101F35]">
            No crew members match the selected filters
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearch('');
              setFilterMode('All');
              setTradeFilter('All Trades');
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {paginated.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setSelectedWorker(w)}
              className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-[#2563EB]/60 transition-colors cursor-pointer space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#101F35] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {w.name
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#101F35] truncate">
                      {w.name}
                    </div>
                    <div className="text-xs text-[#64748B] truncate">
                      <span className="font-mono-num">{w.employeeId}</span> · {w.designation}
                    </div>
                  </div>
                </div>
                <StatusIndicator label={w.attendanceStatus} />
              </div>

              <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2 text-[#64748B]">
                  <span>{w.skillCategory} · {w.employmentType}</span>
                  <span className="font-medium text-[#172B4D]">{w.availabilityStatus}</span>
                </div>
                <div className="text-[#64748B] truncate">
                  Task: <span className="text-[#172B4D]">{w.currentTaskTitle || 'Unassigned'}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#64748B] pt-1">
          <span className="font-mono-num">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <WorkerProfileModal
        worker={selectedWorker}
        attendance={attendance.find((a) => a.workerId === selectedWorker?.id)}
        tasks={tasks}
        onClose={() => setSelectedWorker(null)}
      />
      <AddWorkerModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
