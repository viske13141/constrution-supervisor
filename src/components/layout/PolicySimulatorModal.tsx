import { Building2, RotateCcw, ShieldCheck, Users } from 'lucide-react';
import { ResponsiveModal } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { resetDb, updateCompanyPolicy } from '@/src/services/mockApiClient';
import { useAppStore } from '@/src/store/useAppStore';
import { toast } from 'sonner';

export function PolicySimulatorModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    company,
    user,
    allCompanies,
    allUsers,
    allProjects,
    allSites,
    refreshAll,
  } = useAuthContext();
  const { setContext } = useAppStore();

  const handleSelectPersona = (targetUserId: string) => {
    const targetUser = allUsers.find((u) => u.id === targetUserId);
    if (!targetUser) return;
    const proj =
      allProjects.find(
        (p) =>
          p.companyId === targetUser.companyId &&
          targetUser.assignedProjectIds.includes(p.id)
      ) ?? allProjects[0];
    const site =
      allSites.find(
        (s) =>
          s.companyId === targetUser.companyId &&
          targetUser.assignedSiteIds.includes(s.id)
      ) ?? allSites[0];

    setContext({
      companyId: targetUser.companyId,
      userId: targetUser.id,
      projectId: proj.id,
      siteId: site.id,
    });
    refreshAll();
    toast.success(`Switched demonstration context to ${targetUser.name}`);
  };

  const handleTogglePolicy = (
    key: keyof typeof company.policy,
    value: boolean
  ) => {
    updateCompanyPolicy(company.id, { [key]: value });
    refreshAll();
    toast.success(`Updated Company Admin policy for ${company.name}`);
  };

  const handleResetDemo = () => {
    resetDb();
    setContext({
      companyId: 'comp-medium',
      userId: 'user-suresh',
      projectId: 'proj-gv',
      siteId: 'site-gv-tower-a',
    });
    refreshAll();
    toast.success('Demonstration dataset reset to initial sample records.');
  };

  const policyToggles: Array<{
    key: keyof typeof company.policy;
    label: string;
    desc: string;
  }> = [
    {
      key: 'requireAttendanceApproval',
      label: 'Require Site Manager approval for attendance exceptions',
      desc: 'When enabled, supervisor attendance corrections remain pending until Site Manager/HR reviews.',
    },
    {
      key: 'requirePurchaseApproval',
      label: 'Require Site Manager & Procurement approval for purchases',
      desc: 'Routes supervisor purchase requests through the configured approval chain.',
    },
    {
      key: 'allowSupervisorViewWages',
      label: 'Allow supervisors to view worker daily wage data',
      desc: 'Disabled by default to protect confidential payroll information.',
    },
    {
      key: 'allowSupervisorVerifyInventory',
      label: 'Allow supervisors to post material receipts directly to inventory',
      desc: 'When disabled, deliveries stay Pending Verification until Storekeeper/Site Manager confirms.',
    },
    {
      key: 'allowSupervisorEditSubmitted',
      label: 'Allow editing submitted reports & records',
      desc: 'Controls whether supervisors can modify records after submission.',
    },
    {
      key: 'enableGpsCapture',
      label: 'Enable operational GPS & timestamp capture',
      desc: 'Used strictly during authorized delivery and site verification actions.',
    },
  ];

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title="Company Context & Admin Policy Simulator"
      subtitle="Demonstration tool to test Small, Medium, and Large construction company configurations. In production, only Company Admins configure these rules."
      maxWidthClass="max-w-3xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={handleResetDemo}>
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Demo Data
          </Button>
          <Button variant="navy" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
          Users cannot elevate their own permissions in production. All backend service calls enforce tenant, site, and crew isolation based on the active Company Admin policy below.
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#101F35]">
            <Building2 className="w-4 h-4 text-[#2563EB]" />
            <span>1. Switch Company Size & Assigned Persona</span>
          </div>

          <div className="space-y-3">
            {allCompanies.map((comp) => {
              const compUsers = allUsers.filter((u) => u.companyId === comp.id);
              const sizeLabel =
                comp.size === 'small'
                  ? 'Small Company (Combined Site Manager + Supervisor)'
                  : comp.size === 'medium'
                  ? 'Medium Company (Dedicated Supervisor + Site Manager Review)'
                  : 'Large Company (Multiple Trade Supervisors under 1 Site Manager)';

              return (
                <div
                  key={comp.id}
                  className="rounded-xl border border-slate-200 p-3.5 space-y-2.5 bg-slate-50/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-[#101F35]">
                        {comp.name}
                      </div>
                      <div className="text-xs text-[#64748B]">{sizeLabel}</div>
                    </div>
                    <span className="text-xs font-mono-num text-slate-500">
                      {comp.code}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {compUsers.map((u) => {
                      const active = u.id === user.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSelectPersona(u.id)}
                          className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                            active
                              ? 'border-[#2563EB] bg-blue-50/70 text-[#101F35]'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <Users className="w-4 h-4 mt-0.5 shrink-0 text-[#2563EB]" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">
                              {u.name} {active ? '(Active)' : ''}
                            </div>
                            <div className="text-[11px] text-[#64748B] truncate">
                              {u.designation}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-3 pt-2 border-t border-slate-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#101F35]">
            <ShieldCheck className="w-4 h-4 text-[#2563EB]" />
            <span>2. Company Admin Policy Rules ({company.name})</span>
          </div>

          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {policyToggles.map((item) => {
              const checked = Boolean(company.policy[item.key]);
              return (
                <label
                  key={String(item.key)}
                  className="flex items-start justify-between gap-4 p-3.5 cursor-pointer hover:bg-slate-50/70"
                >
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-medium text-[#172B4D]">
                      {item.label}
                    </div>
                    <div className="text-xs text-[#64748B] mt-0.5">
                      {item.desc}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      handleTogglePolicy(item.key, e.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] shrink-0"
                  />
                </label>
              );
            })}
          </div>
        </section>
      </div>
    </ResponsiveModal>
  );
}
