import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download } from 'lucide-react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { crewService } from '@/src/services/crewService';
import { taskService } from '@/src/services/taskService';
import { purchaseService } from '@/src/services/purchaseService';
import { safetyService } from '@/src/services/safetyService';
import { exportToCsv } from '@/src/lib/utils';
import { toast } from 'sonner';

export function WorkProgressPage() {
  const { ctx, user, site } = useAuthContext();
  const [range, setRange] = React.useState<'7d' | '14d' | '30d'>('7d');

  const { data: workers = [] } = useQuery({
    queryKey: ['crew', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => crewService.listAssignedWorkers(ctx),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => taskService.listTasks(ctx),
  });
  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases', ctx.companyId, ctx.siteId],
    queryFn: () => purchaseService.listPurchaseRequests(ctx),
  });
  const { data: incidents = [] } = useQuery({
    queryKey: ['safety', ctx.companyId, ctx.siteId],
    queryFn: () => safetyService.listIncidents(ctx),
  });

  const presentToday = workers.filter(
    (w) => w.attendanceStatus === 'Present' || w.attendanceStatus === 'Late'
  ).length;
  const absentToday = Math.max(0, workers.length - presentToday);

  const attendanceTrend = [
    { day: '12 Nov', Present: Math.max(1, presentToday - 2), Absent: absentToday + 2 },
    { day: '13 Nov', Present: Math.max(1, presentToday - 1), Absent: absentToday + 1 },
    { day: '14 Nov', Present: presentToday, Absent: absentToday },
    { day: '15 Nov', Present: Math.max(1, presentToday - 3), Absent: absentToday + 3 },
    { day: '16 Nov', Present: Math.max(1, presentToday + 1), Absent: Math.max(0, absentToday - 1) },
    { day: '17 Nov', Present: Math.max(1, presentToday + 1), Absent: Math.max(0, absentToday - 1) },
    { day: '18 Nov', Present: presentToday, Absent: absentToday },
  ];

  const categoryMap = tasks.reduce<Record<string, { category: string; completed: number; active: number }>>(
    (acc, t) => {
      if (!acc[t.workCategory]) {
        acc[t.workCategory] = { category: t.workCategory, completed: 0, active: 0 };
      }
      if (['Completed', 'Submitted for Review', 'Approved'].includes(t.status)) {
        acc[t.workCategory].completed += 1;
      } else {
        acc[t.workCategory].active += 1;
      }
      return acc;
    },
    {}
  );
  const categoryChartData = Object.values(categoryMap);

  const handleExport = () => {
    exportToCsv(
      `buildflow_${site.zoneCode}_progress_summary.csv`,
      tasks.map((t) => ({
        Task: t.title,
        Zone: t.workZone,
        Category: t.workCategory,
        Status: t.status,
        ProgressPercent: t.progressPercent,
        AssignedCrew: t.assignments.length,
        DueDate: t.dueDate,
      }))
    );
    toast.success('Exported scoped site progress CSV.');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Work Progress & Site Analytics"
        metadata={[site.name, 'Scoped to your assigned crew and site only (Sample demonstration metrics)']}
        actions={
          <div className="flex items-center gap-2">
            <select
              aria-label="Report range"
              value={range}
              onChange={(e) => setRange(e.target.value as '7d' | '14d' | '30d')}
              className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs"
            >
              <option value="7d">Last 7 Days</option>
              <option value="14d">Last 14 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            {user.effectivePermissions.export_reports && (
              <Button size="sm" variant="outline" onClick={handleExport}>
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-[#64748B]">Attendance Rate Today</div>
          <div className="mt-1 text-2xl font-bold font-mono-num text-[#101F35]">
            {workers.length ? Math.round((presentToday / workers.length) * 100) : 0}%
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-[#64748B]">Task Completion Rate</div>
          <div className="mt-1 text-2xl font-bold font-mono-num text-[#16A34A]">
            {tasks.length
              ? Math.round(
                  (tasks.filter((t) =>
                    ['Completed', 'Submitted for Review', 'Approved'].includes(t.status)
                  ).length /
                    tasks.length) *
                    100
                )
              : 0}
            %
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-[#64748B]">Purchase Requests Logged</div>
          <div className="mt-1 text-2xl font-bold font-mono-num text-[#101F35]">
            {purchases.length}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-[#64748B]">Safety Incidents (Period)</div>
          <div className="mt-1 text-2xl font-bold font-mono-num text-[#101F35]">
            {incidents.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Crew Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip />
                  <Bar dataKey="Present" stackId="a" fill="#16A34A" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Absent" stackId="a" fill="#DC2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Completion by Work Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip />
                  <Bar dataKey="completed" name="Completed / Review" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="active" name="Active / Blocked" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
