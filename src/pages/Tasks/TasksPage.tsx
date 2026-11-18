import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Kanban, List, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/button';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { TaskCreateModal } from '@/src/components/modals/TaskCreateModal';
import { TaskDetailModal } from '@/src/components/tasks/TaskDetailModal';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { taskService } from '@/src/services/taskService';
import type { Task, TaskStatus } from '@/src/types/models';

const KANBAN_COLUMNS: Array<{ title: string; statuses: TaskStatus[] }> = [
  { title: 'Assigned / Draft', statuses: ['Draft', 'Assigned', 'Accepted'] },
  { title: 'In Progress', statuses: ['In Progress'] },
  { title: 'Blocked', statuses: ['Blocked', 'Rejected / Rework Required'] },
  { title: 'Completed / Review', statuses: ['Completed', 'Submitted for Review', 'Approved'] },
];

export function TasksPage() {
  const { ctx, site } = useAuthContext();
  const [viewMode, setViewMode] = React.useState<'list' | 'kanban' | 'calendar'>('list');
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('All');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => taskService.listTasks(ctx),
  });

  const filtered = tasks.filter((t) => {
    const q = search.trim().toLowerCase();
    if (
      q &&
      !t.title.toLowerCase().includes(q) &&
      !t.workZone.toLowerCase().includes(q) &&
      !t.workCategory.toLowerCase().includes(q)
    ) {
      return false;
    }
    if (statusFilter !== 'All' && t.status !== statusFilter) return false;
    return true;
  });

  // Group tasks by dueDate for Calendar/Schedule View
  const tasksByDate = filtered.reduce<Record<string, Task[]>>((acc, t) => {
    const key = t.dueDate || 'Unscheduled';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});
  const sortedDates = Object.keys(tasksByDate).sort();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Daily Task Allocation & Tracking"
        metadata={[site.name, `${tasks.length} total tasks`]}
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              {[
                { key: 'list' as const, label: 'List', icon: List },
                { key: 'kanban' as const, label: 'Board', icon: Kanban },
                { key: 'calendar' as const, label: 'Schedule', icon: CalendarDays },
              ].map((v) => {
                const Icon = v.icon;
                return (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setViewMode(v.key)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                      viewMode === v.key
                        ? 'bg-[#101F35] text-white'
                        : 'text-[#64748B] hover:text-[#101F35]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{v.label}</span>
                  </button>
                );
              })}
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              Assign New Task
            </Button>
          </div>
        }
      />

      {/* Search & Status Filter */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search task title, work zone, or trade..."
            className="w-full min-h-[40px] rounded-lg border border-slate-300 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          aria-label="Filter by task status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="All">All Statuses</option>
          <option value="Assigned">Assigned</option>
          <option value="In Progress">In Progress</option>
          <option value="Blocked">Blocked</option>
          <option value="Completed">Completed</option>
          <option value="Submitted for Review">Submitted for Review</option>
          <option value="Approved">Approved</option>
        </select>
      </div>

      {isLoading ? (
        <div className="h-48 rounded-xl border border-slate-200 bg-white animate-pulse" />
      ) : viewMode === 'list' ? (
        <div className="space-y-2.5">
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTask(t)}
              className="w-full text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-[#2563EB]/60 transition-colors cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="min-w-0 space-y-1">
                  <div className="text-sm sm:text-base font-semibold text-[#101F35]">
                    {t.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#64748B]">
                    <span>{t.workZone}</span>
                    <span aria-hidden="true">·</span>
                    <span>{t.workCategory}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">{t.assignments.length} workers</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">Due {t.dueDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="w-24 hidden sm:block">
                    <div className="flex justify-between text-[11px] font-mono-num text-[#64748B] mb-1">
                      <span>Progress</span>
                      <span>{t.progressPercent}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-[#2563EB]"
                        style={{ width: `${t.progressPercent}%` }}
                      />
                    </div>
                  </div>
                  <StatusIndicator label={t.priority} />
                  <StatusIndicator label={t.status} />
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const colTasks = filtered.filter((t) => col.statuses.includes(t.status));
            return (
              <div
                key={col.title}
                className="rounded-xl border border-slate-200 bg-slate-100/70 p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-[#101F35]">
                    {col.title}
                  </span>
                  <span className="font-mono-num text-xs font-semibold text-[#64748B]">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colTasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-[#64748B]">
                      No tasks
                    </div>
                  ) : (
                    colTasks.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTask(t)}
                        className="w-full text-left rounded-lg border border-slate-200 bg-white p-3 hover:border-[#2563EB] transition-colors cursor-pointer space-y-2"
                      >
                        <div className="text-sm font-semibold text-[#101F35]">
                          {t.title}
                        </div>
                        <div className="text-xs text-[#64748B] truncate">
                          {t.workZone}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                          <span className="font-mono-num text-[#64748B]">
                            {t.assignments.length} crew · {t.progressPercent}%
                          </span>
                          <StatusIndicator label={t.priority} />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((dateStr) => (
            <div key={dateStr} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-semibold font-mono-num text-[#101F35]">
                  Due {dateStr}
                </span>
                <span className="text-xs text-[#64748B] font-mono-num">
                  {tasksByDate[dateStr].length} task(s)
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {tasksByDate[dateStr].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTask(t)}
                    className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#101F35] truncate">
                        {t.title}
                      </div>
                      <div className="text-xs text-[#64748B]">
                        {t.workZone} · {t.assignments.length} workers · Start {t.startDate}
                      </div>
                    </div>
                    <StatusIndicator label={t.status} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
}
