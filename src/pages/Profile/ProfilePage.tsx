import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Lock, Save, XCircle } from 'lucide-react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { SafeImage } from '@/src/components/shared/SafeImage';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { communicationService } from '@/src/services/communicationService';
import { toast } from 'sonner';

export function ProfilePage() {
  const { ctx, company, user, project, site, assignedCrews, auditLogs, refreshAll } =
    useAuthContext();
  const [phone, setPhone] = React.useState(user.phone);
  const [emergencyContact, setEmergencyContact] = React.useState(
    user.emergencyContact
  );

  React.useEffect(() => {
    setPhone(user.phone);
    setEmergencyContact(user.emergencyContact);
  }, [user.phone, user.emergencyContact]);

  const mutation = useMutation({
    mutationFn: () =>
      communicationService.updateOwnContact(ctx, { phone, emergencyContact }),
    onSuccess: () => {
      refreshAll();
      toast.success('Personal contact details updated.');
    },
  });

  const permissionRows: Array<{ label: string; allowed: boolean }> = [
    { label: 'View Assigned Crew & Site', allowed: user.effectivePermissions.view_assigned_crew },
    { label: 'Record Attendance Exceptions', allowed: user.effectivePermissions.record_attendance_exceptions },
    { label: 'Direct Attendance Verification', allowed: user.effectivePermissions.verify_attendance_directly },
    { label: 'Allocate Daily Tasks & Update Progress', allowed: user.effectivePermissions.allocate_daily_tasks },
    { label: 'Approve Completed Tasks (Site Manager)', allowed: user.effectivePermissions.approve_completed_tasks },
    { label: 'Submit Purchase Requests', allowed: user.effectivePermissions.submit_purchase_request },
    { label: 'Approve Own Purchase Requests', allowed: user.effectivePermissions.approve_own_purchase },
    { label: 'Verify & Post Inventory Receipts', allowed: user.effectivePermissions.verify_inventory_receipt },
    { label: 'View Confidential Worker Wages', allowed: user.effectivePermissions.view_worker_wages },
    { label: 'Close Critical Safety Incidents', allowed: user.effectivePermissions.close_critical_safety },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Profile & Effective Permissions"
        metadata={[company.name, user.employeeId, user.designation]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-6 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Assignment & Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <SafeImage
                  src={user.avatarUrl}
                  alt={user.name}
                  fallbackLabel={user.name}
                  className="w-16 h-16 rounded-xl border border-slate-200 shrink-0"
                />
                <div>
                  <div className="text-base font-bold text-[#101F35]">
                    {user.name}
                  </div>
                  <div className="text-xs text-[#64748B]">
                    {user.designation} · {user.departmentName}
                  </div>
                  <div className="text-xs font-mono-num text-[#64748B] mt-0.5">
                    {user.employeeId} · {user.email}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[#64748B]">
                  <span>Company-Controlled Assignments</span>
                  <span className="inline-flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Admin Managed
                  </span>
                </div>
                <div>
                  Project: <strong className="text-[#101F35]">{project.name}</strong>
                </div>
                <div>
                  Site: <strong className="text-[#101F35]">{site.name}</strong>
                </div>
                <div>
                  Assigned Crew:{' '}
                  <strong className="text-[#101F35]">
                    {assignedCrews.map((c) => c.name).join(', ') || 'All Site Crews'}
                  </strong>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate();
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-semibold text-[#101F35] mb-1">
                    Personal Mobile Number
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#101F35] mb-1">
                    Emergency Contact
                  </label>
                  <input
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
                  />
                </div>
                <Button type="submit" size="sm" disabled={mutation.isPending}>
                  <Save className="w-4 h-4" />
                  Save Personal Contact
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Audit Log */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Security & Operational Audit Trail</CardTitle>
            </CardHeader>
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {auditLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="px-4 py-2.5 text-xs space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-num font-semibold text-[#101F35]">
                      {log.action}
                    </span>
                    <span className="font-mono-num text-[#64748B]">
                      {log.timestamp}
                    </span>
                  </div>
                  <div className="text-[#64748B]">
                    {log.actorName} — {log.details}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Effective Permissions Matrix */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle>Effective Role Permissions ({company.name})</CardTitle>
            <p className="text-xs text-[#64748B]">
              Enforced on backend service layer. Users cannot modify their own permissions.
            </p>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {permissionRows.map((row) => (
              <div
                key={row.label}
                className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs sm:text-sm"
              >
                <span className="text-[#172B4D]">{row.label}</span>
                {row.allowed ? (
                  <span className="inline-flex items-center gap-1 font-medium text-[#16A34A] shrink-0">
                    <CheckCircle2 className="w-4 h-4" /> Allowed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-medium text-[#64748B] shrink-0">
                    <XCircle className="w-4 h-4" /> Restricted
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
