import {
  appendAuditLog,
  loadDb,
  matchesTenantAndCrew,
  saveDb,
  simulateLatency,
} from '@/src/services/mockApiClient';
import {
  assertPermission,
  assertTenantScope,
  type AuthContext,
} from '@/src/services/policyService';
import type {
  PurchaseAttachment,
  PurchaseRequest,
  PurchaseRequestItem,
  PurchaseStatus,
} from '@/src/types/models';

export interface CreatePurchaseRequestInput {
  workZone: string;
  requiredDeliveryDate: string;
  supplierPreference?: string;
  reason: string;
  priority: 'Standard' | 'Urgent' | 'Critical';
  remarks?: string;
  asDraft?: boolean;
  items: Array<Omit<PurchaseRequestItem, 'id' | 'estimatedTotal'>>;
  attachments: PurchaseAttachment[];
}

export const purchaseService = {
  async listPurchaseRequests(ctx: AuthContext): Promise<PurchaseRequest[]> {
    const db = loadDb();
    const list = db.purchaseRequests.filter((p) => matchesTenantAndCrew(ctx, p));
    return simulateLatency(list);
  },

  async createPurchaseRequest(
    ctx: AuthContext,
    input: CreatePurchaseRequestInput
  ): Promise<PurchaseRequest> {
    assertPermission(ctx, 'submit_purchase_request');
    const db = loadDb();

    const items: PurchaseRequestItem[] = input.items.map((item, idx) => ({
      id: `pri-${Date.now()}-${idx}`,
      materialCategory: item.materialCategory,
      materialName: item.materialName.trim(),
      quantity: item.quantity,
      unit: item.unit.trim(),
      estimatedUnitPrice: item.estimatedUnitPrice,
      estimatedTotal: Math.round(item.quantity * item.estimatedUnitPrice),
    }));

    const totalEstimatedAmount = items.reduce((sum, i) => sum + i.estimatedTotal, 0);
    const firstStage = ctx.policy.approvalChain[0] || 'Site Manager';

    const status: PurchaseStatus = input.asDraft
      ? 'Draft'
      : ctx.policy.requirePurchaseApproval
      ? firstStage === 'Site Manager'
        ? 'Pending Site Manager Review'
        : 'Pending Procurement'
      : 'Submitted';

    const nextNumber = 422 + db.purchaseRequests.length;
    const newPr: PurchaseRequest = {
      id: `pr-${Date.now()}`,
      requestCode: `PR-2026-0${nextNumber}`,
      companyId: ctx.companyId,
      projectId: ctx.projectId,
      siteId: ctx.siteId,
      workZone: input.workZone.trim(),
      requestedById: ctx.user.id,
      requestedByName: ctx.user.name,
      requestDate: '2026-11-18',
      requiredDeliveryDate: input.requiredDeliveryDate,
      supplierPreference: input.supplierPreference?.trim() || undefined,
      reason: input.reason.trim(),
      priority: input.priority,
      remarks: input.remarks?.trim() || undefined,
      status,
      currentApprover: input.asDraft ? 'Supervisor (Draft)' : `${firstStage} Review`,
      items,
      totalEstimatedAmount,
      attachments: input.attachments,
      approvalHistory: [
        {
          id: `ar-${Date.now()}`,
          companyId: ctx.companyId,
          entityType: 'PurchaseRequest',
          entityId: `pr-${Date.now()}`,
          stage: input.asDraft ? 'Draft Saved' : 'Supervisor Submission',
          decision: 'Submitted',
          actorId: ctx.user.id,
          actorName: ctx.user.name,
          remarks: input.reason,
          timestamp: new Date().toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
        },
      ],
    };

    assertTenantScope(ctx, newPr);
    db.purchaseRequests.unshift(newPr);

    appendAuditLog(
      db,
      ctx,
      input.asDraft ? 'SAVE_PURCHASE_DRAFT' : 'SUBMIT_PURCHASE_REQUEST',
      'PurchaseRequest',
      newPr.id,
      `${newPr.requestCode} (${items.length} items, ₹${totalEstimatedAmount.toLocaleString('en-IN')}) status=${status}`
    );

    saveDb(db);
    return simulateLatency(newPr);
  },

  async approvePurchaseRequest(ctx: AuthContext, purchaseId: string, remarks?: string): Promise<PurchaseRequest> {
    const db = loadDb();
    const pr = db.purchaseRequests.find((p) => p.id === purchaseId);
    if (!pr) throw new Error('Purchase request not found.');
    assertTenantScope(ctx, pr);

    // Crucial business rule: supervisors cannot approve their own requests unless explicitly allowed by policy
    if (pr.requestedById === ctx.user.id && !ctx.user.effectivePermissions.approve_own_purchase) {
      throw new Error('Policy restriction: You cannot approve your own purchase request.');
    }

    if (ctx.user.role === 'supervisor' && !ctx.user.effectivePermissions.approve_own_purchase) {
      throw new Error('Only authorized Site Manager or Procurement roles can approve purchase requests.');
    }

    pr.status = 'Approved';
    pr.currentApprover = 'Procurement / Dispatch';
    pr.approvalHistory.push({
      id: `ar-${Date.now()}`,
      companyId: ctx.companyId,
      entityType: 'PurchaseRequest',
      entityId: pr.id,
      stage: 'Manager Approval',
      decision: 'Approved',
      actorId: ctx.user.id,
      actorName: ctx.user.name,
      remarks: remarks || 'Approved for procurement.',
      timestamp: 'Just now',
    });

    appendAuditLog(
      db,
      ctx,
      'APPROVE_PURCHASE_REQUEST',
      'PurchaseRequest',
      pr.id,
      `Approved ${pr.requestCode}`
    );

    saveDb(db);
    return simulateLatency({ ...pr });
  },
};
