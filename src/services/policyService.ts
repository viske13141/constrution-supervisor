import type { CompanyPolicy, PermissionKey, User } from '@/src/types/models';

export interface AuthContext {
  user: User;
  companyId: string;
  projectId: string;
  siteId: string;
  policy: CompanyPolicy;
}

export function computeEffectivePermissions(
  user: User,
  policy: CompanyPolicy
): Record<PermissionKey, boolean> {
  const isHybridManager = user.role === 'site_manager_hybrid';
  const isSiteManager = user.role === 'site_manager';
  const isManager = isHybridManager || isSiteManager;

  return {
    view_assigned_crew: true,
    view_assigned_site: true,
    view_assigned_attendance: true,
    record_attendance_exceptions: true,
    verify_attendance_directly: isManager || !policy.requireAttendanceApproval,
    allocate_daily_tasks: true,
    update_task_progress: true,
    approve_completed_tasks: isManager,
    submit_purchase_request: true,
    approve_own_purchase: isManager ? !policy.requirePurchaseApproval : policy.allowSupervisorSelfPurchaseApproval,
    record_material_delivery: true,
    verify_inventory_receipt: isManager || policy.allowSupervisorVerifyInventory,
    submit_daily_report: true,
    review_daily_reports: isManager,
    edit_submitted_records: isManager || policy.allowSupervisorEditSubmitted,
    view_worker_wages: isManager || policy.allowSupervisorViewWages,
    view_worker_contact: true,
    manage_crew_reassignment: isManager,
    close_critical_safety: isManager,
    export_reports: true,
    upload_site_documents: true,
  };
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export function assertTenantScope(
  ctx: AuthContext,
  record: { companyId: string; siteId?: string; crewId?: string }
): void {
  if (record.companyId !== ctx.companyId) {
    throw new AuthorizationError('Tenant isolation violation: cross-company access denied.');
  }
  if (record.siteId && !ctx.user.assignedSiteIds.includes(record.siteId)) {
    throw new AuthorizationError('Site isolation violation: user is not assigned to this construction site.');
  }
  if (
    record.crewId &&
    ctx.user.role === 'supervisor' &&
    ctx.user.assignedCrewIds.length > 0 &&
    !ctx.user.assignedCrewIds.includes(record.crewId)
  ) {
    throw new AuthorizationError('Crew isolation violation: supervisor may only access assigned crews.');
  }
}

export function assertPermission(ctx: AuthContext, permission: PermissionKey): void {
  const effective = computeEffectivePermissions(ctx.user, ctx.policy);
  if (!effective[permission]) {
    throw new AuthorizationError(`Operation denied by company policy (${permission}).`);
  }
}
