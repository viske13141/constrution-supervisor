import * as React from 'react';
import { Lock, Phone, ShieldCheck } from 'lucide-react';
import { ResponsiveModal } from '@/src/components/ui/dialog';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import type { Attendance, Task, Worker } from '@/src/types/models';
import { formatCurrencyINR } from '@/src/lib/utils';

type TabKey = 'overview' | 'attendance' | 'tasks' | 'history' | 'documents' | 'activity';

export function WorkerProfileModal({
  worker,
  attendance,
  tasks,
  onClose,
}: {
  worker: Worker | null;
  attendance?: Attendance;
  tasks: Task[];
  onClose: () => void;
}) {
  const { user, project, site } = useAuthContext();
  const [activeTab, setActiveTab] = React.useState<TabKey>('overview');

  React.useEffect(() => {
    if (worker) setActiveTab('overview');
  }, [worker]);

  if (!worker) return null;

  const assignedTasks = tasks.filter((t) =>
    t.assignments.some((a) => a.workerId === worker.id)
  );

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'tasks', label: `Tasks (${assignedTasks.length})` },
    { key: 'history', label: 'Work History' },
    { key: 'documents', label: 'Documents' },
    { key: 'activity', label: 'Activity' },
  ];

  return (
    <ResponsiveModal
      open={Boolean(worker)}
      onClose={onClose}
      title={worker.name}
      subtitle={`${worker.employeeId} · ${worker.designation} · ${worker.employmentType}`}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Header Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#101F35] text-white font-semibold flex items-center justify-center text-base shrink-0">
              {worker.name
                .split(' ')
                .map((s) => s[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div>
              <div className="text-sm font-semibold text-[#101F35]">
                {worker.designation} · {worker.skillCategory}
              </div>
              <div className="text-xs text-[#64748B]">
                {project.name} · {site.name}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusIndicator label={worker.attendanceStatus} />
            <StatusIndicator label={worker.availabilityStatus} />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-[#101F35] text-white'
                  : 'text-[#64748B] hover:bg-slate-100 hover:text-[#101F35]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="rounded-lg border border-slate-200 p-3 space-y-2">
              <div className="text-xs font-semibold text-[#64748B]">Assignment Details</div>
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Employee ID</span>
                <span className="font-mono-num font-medium">{worker.employeeId}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Trade / Skill</span>
                <span className="font-medium">
                  {worker.designation} ({worker.skillCategory})
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Employment</span>
                <span className="font-medium">
                  {worker.contractorName
                    ? `${worker.employmentType} (${worker.contractorName})`
                    : worker.employmentType}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[#64748B]">Joined Site</span>
                <span className="font-mono-num">{worker.joinedDate}</span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3 space-y-2">
              <div className="text-xs font-semibold text-[#64748B]">Contact & Policy Access</div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-[#64748B]">Phone</span>
                {user.effectivePermissions.view_worker_contact ? (
                  <a
                    href={`tel:${worker.phone}`}
                    className="inline-flex items-center gap-1 font-mono-num text-[#2563EB] hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {worker.phone}
                  </a>
                ) : (
                  <span className="text-slate-400">Restricted</span>
                )}
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-[#64748B]">Current Task</span>
                <span className="font-medium text-right">
                  {worker.currentTaskTitle || 'Unassigned'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2 pt-1 border-t border-slate-100">
                <span className="text-[#64748B]">Daily Wage Rate</span>
                {user.effectivePermissions.view_worker_wages ? (
                  <span className="font-mono-num font-semibold text-[#101F35]">
                    {formatCurrencyINR(worker.dailyWageInr)} / day
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Lock className="w-3 h-3" /> Restricted by Company Policy
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-3 text-xs sm:text-sm">
            {attendance ? (
              <div className="rounded-lg border border-slate-200 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#101F35]">
                    Today ({attendance.date})
                  </span>
                  <StatusIndicator label={attendance.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#64748B]">
                  <div>Check-In: <span className="font-mono-num text-[#172B4D]">{attendance.checkInTime || '—'}</span></div>
                  <div>Check-Out: <span className="font-mono-num text-[#172B4D]">{attendance.checkOutTime || '—'}</span></div>
                  <div>Photo: <span className="text-[#172B4D]">{attendance.checkInPhotoStatus}</span></div>
                  <div>GPS: <span className="text-[#172B4D]">{attendance.gpsVerificationStatus}</span></div>
                </div>
                {attendance.exceptions.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="text-xs font-semibold text-[#101F35]">
                      Correction History
                    </div>
                    {attendance.exceptions.map((ex) => (
                      <div key={ex.id} className="rounded bg-slate-50 p-2 text-xs">
                        <div className="font-medium">
                          {ex.originalStatus} → {ex.requestedStatus} ({ex.approvalStatus})
                        </div>
                        <div className="text-[#64748B]">{ex.reason} — {ex.remarks}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#64748B]">No attendance record found for today.</p>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-2">
            {assignedTasks.length === 0 ? (
              <p className="text-sm text-[#64748B]">No tasks currently assigned.</p>
            ) : (
              assignedTasks.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#101F35] truncate">
                      {t.title}
                    </div>
                    <div className="text-xs text-[#64748B]">
                      {t.workZone} · Due {t.dueDate}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono-num text-xs font-semibold">
                      {t.progressPercent}%
                    </span>
                    <StatusIndicator label={t.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {worker.workHistory.length === 0 ? (
              <div className="p-3 text-sm text-[#64748B]">No prior work history recorded.</div>
            ) : (
              worker.workHistory.map((h, i) => (
                <div key={i} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-[#172B4D]">{h.taskTitle}</div>
                    <div className="text-[#64748B]">{h.siteName} · {h.date}</div>
                  </div>
                  <div className="text-right font-mono-num">
                    <div className="font-semibold">{h.hoursWorked} hrs</div>
                    <div className="text-[#64748B]">{h.status}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-2">
            {worker.documents.map((doc) => (
              <div
                key={doc.id}
                className="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  {doc.restricted ? (
                    <Lock className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                  )}
                  <div>
                    <div className="font-medium text-[#172B4D]">{doc.title}</div>
                    <div className="text-[#64748B]">{doc.type}</div>
                  </div>
                </div>
                <span className="text-xs font-medium text-[#64748B]">
                  {doc.restricted ? 'HR Restricted' : doc.verified ? 'Verified' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="text-xs text-[#64748B] rounded-lg border border-slate-200 p-3 space-y-1.5">
            <div>Assigned to {site.name} under Supervisor {user.name}.</div>
            <div>Last attendance telemetry date: {attendance?.date || '2026-11-18'}.</div>
            <div>Current availability: {worker.availabilityStatus}.</div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}
