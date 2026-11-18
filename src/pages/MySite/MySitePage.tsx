import { useQuery } from '@tanstack/react-query';
import { Building2, Clock, MapPin, Phone, ShieldAlert, Users } from 'lucide-react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { SafeImage } from '@/src/components/shared/SafeImage';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { crewService } from '@/src/services/crewService';
import { taskService } from '@/src/services/taskService';
import { materialService } from '@/src/services/materialService';
import { safetyService } from '@/src/services/safetyService';

export function MySitePage() {
  const { ctx, user, project, site, assignedCrews } = useAuthContext();

  const { data: workers = [] } = useQuery({
    queryKey: ['crew', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => crewService.listAssignedWorkers(ctx),
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => taskService.listTasks(ctx),
  });
  const { data: receipts = [] } = useQuery({
    queryKey: ['material-receipts', ctx.companyId, ctx.siteId],
    queryFn: () => materialService.listReceipts(ctx),
  });
  const { data: incidents = [] } = useQuery({
    queryKey: ['safety', ctx.companyId, ctx.siteId],
    queryFn: () => safetyService.listIncidents(ctx),
  });

  const presentCount = workers.filter((w) => w.attendanceStatus === 'Present').length;
  const openTasks = tasks.filter((t) => !['Completed', 'Approved'].includes(t.status)).length;
  const pendingMaterials = receipts.filter((r) => !r.inventoryPosted).length;
  const activeAlerts = incidents.filter((i) => i.status !== 'Closed').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={site.name}
        metadata={[project.name, `Zone ${site.zoneCode}`, 'Assigned Site Only']}
        actions={<StatusIndicator label={site.operationalStatus} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-[#64748B]">Overall Project Progress</div>
          <div className="mt-1 text-2xl font-bold font-mono-num text-[#101F35]">
            {project.progressPercent}%
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-[#2563EB]"
              style={{ width: `${project.progressPercent}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-[#64748B]">Today's Attendance</div>
          <div className="mt-1 text-2xl font-bold font-mono-num text-[#101F35]">
            {presentCount} / {workers.length}
          </div>
          <div className="mt-1 text-xs text-[#64748B]">Assigned crew on-site</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-[#64748B]">Open Tasks & Pending Deliveries</div>
          <div className="mt-1 text-2xl font-bold font-mono-num text-[#101F35]">
            {openTasks} · {pendingMaterials}
          </div>
          <div className="mt-1 text-xs text-[#64748B]">Active tasks · Material queue</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-[#64748B]">Active Site Alerts</div>
          <div className="mt-1 text-2xl font-bold font-mono-num text-[#DC2626]">
            {activeAlerts}
          </div>
          <div className="mt-1 text-xs text-[#64748B]">Open safety items</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <Card className="lg:col-span-7 flex flex-col">
          <CardHeader>
            <CardTitle>Site Configuration & Operational Briefing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Project & Site Address
                </div>
                <div className="font-medium text-[#101F35]">{project.name}</div>
                <div className="text-xs text-[#64748B]">{site.address}</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Working Hours & Shift
                </div>
                <div className="font-medium font-mono-num text-[#101F35]">{site.workingHours}</div>
                <div className="text-xs text-[#64748B]">{site.shiftTiming}</div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Site Leadership & Crew Scope
                </div>
                <div className="text-xs text-[#172B4D]">
                  Site Manager: <span className="font-semibold">{site.siteManagerName}</span>
                </div>
                <div className="text-xs text-[#172B4D]">
                  Assigned Supervisor: <span className="font-semibold">{user.name}</span>
                </div>
                <div className="text-xs text-[#64748B]">
                  Crews: {assignedCrews.map((c) => c.name).join(', ') || user.departmentName}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-[#64748B] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Site Emergency & Control Contact
                </div>
                <div className="font-mono-num text-sm font-medium text-[#2563EB]">
                  {site.siteManagerPhone}
                </div>
                <div className="text-xs text-[#64748B]">Site Manager Direct Line</div>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 flex items-start gap-2.5 text-xs text-amber-950">
              <ShieldAlert className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Mandatory Site Safety Briefing</div>
                <div className="mt-0.5">{site.safetyBriefing}</div>
              </div>
            </div>

            <div className="text-xs text-[#64748B] pt-1">
              Site configuration fields (working hours, geofence boundaries, and project hierarchy) are read-only for supervisors and controlled by Company Admin.
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 flex flex-col">
          <CardHeader>
            <CardTitle>Site Zone & Location Reference</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col">
            <SafeImage
              src={site.overviewImageUrl}
              alt={`${site.name} construction site view`}
              fallbackLabel={site.name}
              className="w-full h-48 lg:h-52 rounded-lg border border-slate-200"
            />
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-[#101F35]">
                <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>{site.demoCoordinatesLabel}</span>
              </div>
              <p className="text-[#64748B]">
                Demonstration site reference shown. Live GPS coordinates are only displayed when configured by Company Admin and captured during authorized site actions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
