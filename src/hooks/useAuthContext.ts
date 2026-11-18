import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { loadDb } from '@/src/services/mockApiClient';
import { computeEffectivePermissions, type AuthContext } from '@/src/services/policyService';
import { attendanceService, type SubmitAttendanceExceptionInput } from '@/src/services/attendanceService';
import { taskService, type UpdateTaskProgressInput } from '@/src/services/taskService';
import { purchaseService, type CreatePurchaseRequestInput } from '@/src/services/purchaseService';
import { materialService, type RecordDeliveryInput } from '@/src/services/materialService';
import { reportService, type SubmitDailyReportInput } from '@/src/services/reportService';
import { safetyService, type CreateSafetyIncidentInput } from '@/src/services/safetyService';
import { useAppStore } from '@/src/store/useAppStore';
import { toast } from 'sonner';

export function useAuthContext() {
  const {
    activeCompanyId,
    activeUserId,
    activeProjectId,
    activeSiteId,
    offlineMode,
    syncQueue,
    enqueueSyncAction,
    markSyncItemStatus,
  } = useAppStore();
  const queryClient = useQueryClient();
  const [policyRevision, setPolicyRevision] = useState(0);

  const db = loadDb();
  const company = db.companies.find((c) => c.id === activeCompanyId) ?? db.companies[1];
  const rawUser =
    db.users.find((u) => u.id === activeUserId && u.companyId === company.id) ??
    db.users.find((u) => u.companyId === company.id) ??
    db.users[0];

  const user = useMemo(
    () => ({
      ...rawUser,
      effectivePermissions: computeEffectivePermissions(rawUser, company.policy),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawUser, company.policy, policyRevision]
  );

  const companyProjects = db.projects.filter(
    (p) => p.companyId === company.id && user.assignedProjectIds.includes(p.id)
  );
  const project =
    companyProjects.find((p) => p.id === activeProjectId) ?? companyProjects[0] ?? db.projects[0];

  const projectSites = db.sites.filter(
    (s) =>
      s.companyId === company.id &&
      s.projectId === project.id &&
      user.assignedSiteIds.includes(s.id)
  );
  const site =
    projectSites.find((s) => s.id === activeSiteId) ?? projectSites[0] ?? db.sites[0];

  const assignedCrews = db.crews.filter(
    (c) =>
      c.companyId === company.id &&
      c.siteId === site.id &&
      (user.assignedCrewIds.length === 0 || user.assignedCrewIds.includes(c.id))
  );

  const ctx: AuthContext = {
    user,
    companyId: company.id,
    projectId: project.id,
    siteId: site.id,
    policy: company.policy,
  };

  const refreshAll = () => {
    setPolicyRevision((r) => r + 1);
    queryClient.invalidateQueries();
  };

  const runSyncQueue = async () => {
    if (offlineMode) {
      toast.error('Device is currently offline. Reconnect before syncing.');
      return;
    }
    const pending = syncQueue.filter(
      (i) => i.status === 'Queued Offline' || i.status === 'Failed'
    );
    if (pending.length === 0) {
      toast.info('All offline actions are already synchronized.');
      return;
    }

    for (const item of pending) {
      markSyncItemStatus(item.id, 'Syncing');
      try {
        if (item.actionType === 'ATTENDANCE_EXCEPTION') {
          await attendanceService.submitAttendanceException(
            ctx,
            item.executePayload as unknown as SubmitAttendanceExceptionInput
          );
        } else if (item.actionType === 'TASK_PROGRESS') {
          await taskService.updateTaskProgress(
            ctx,
            item.executePayload as unknown as UpdateTaskProgressInput
          );
        } else if (item.actionType === 'PURCHASE_REQUEST') {
          await purchaseService.createPurchaseRequest(
            ctx,
            item.executePayload as unknown as CreatePurchaseRequestInput
          );
        } else if (item.actionType === 'MATERIAL_RECEIPT') {
          await materialService.recordMaterialDelivery(
            ctx,
            item.executePayload as unknown as RecordDeliveryInput
          );
        } else if (item.actionType === 'DAILY_REPORT') {
          await reportService.submitDailyReport(
            ctx,
            item.executePayload as unknown as SubmitDailyReportInput
          );
        } else if (item.actionType === 'SAFETY_INCIDENT') {
          await safetyService.reportIncident(
            ctx,
            item.executePayload as unknown as CreateSafetyIncidentInput
          );
        }

        markSyncItemStatus(item.id, 'Synced', {
          serverReceivedAt: new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        });
      } catch (err) {
        markSyncItemStatus(item.id, 'Failed', {
          errorMessage: err instanceof Error ? err.message : 'Sync failed',
        });
      }
    }

    queryClient.invalidateQueries();
    toast.success('Queued offline records synchronized with server.');
  };

  return {
    ctx,
    company,
    user,
    project,
    site,
    assignedCrews,
    allCompanies: db.companies,
    allCompanyUsers: db.users.filter((u) => u.companyId === company.id),
    allUsers: db.users,
    allProjects: db.projects,
    allSites: db.sites,
    companyProjects,
    projectSites,
    auditLogs: db.auditLogs.filter((a) => a.companyId === company.id),
    offlineMode,
    enqueueSyncAction,
    runSyncQueue,
    refreshAll,
  };
}
