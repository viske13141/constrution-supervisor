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
  MaterialDeliveryStatus,
  MaterialReceipt,
  MaterialRequirement,
} from '@/src/types/models';

export interface RecordDeliveryInput {
  receiptId: string;
  receivedQuantity: number;
  damagedQuantity: number;
  shortQuantity: number;
  remarks: string;
  challanFileName?: string;
  photoUrls: string[];
  captureGps: boolean;
}

export const materialService = {
  async listRequirements(ctx: AuthContext): Promise<MaterialRequirement[]> {
    const db = loadDb();
    return simulateLatency(
      db.materialRequirements.filter((m) => matchesTenantAndCrew(ctx, m))
    );
  },

  async listReceipts(ctx: AuthContext): Promise<MaterialReceipt[]> {
    const db = loadDb();
    return simulateLatency(
      db.materialReceipts.filter((r) => matchesTenantAndCrew(ctx, r))
    );
  },

  async recordMaterialDelivery(
    ctx: AuthContext,
    input: RecordDeliveryInput
  ): Promise<MaterialReceipt> {
    assertPermission(ctx, 'record_material_delivery');
    const db = loadDb();
    const rec = db.materialReceipts.find((r) => r.id === input.receiptId);
    if (!rec) throw new Error('Material receipt record not found.');
    assertTenantScope(ctx, rec);

    const remaining = Math.max(0, rec.orderedQuantity - input.receivedQuantity);

    let nextStatus: MaterialDeliveryStatus = 'Pending Verification';
    if (input.damagedQuantity > 0) {
      nextStatus = 'Damaged';
    } else if (remaining > 0 && input.receivedQuantity > 0) {
      nextStatus = 'Partially Received';
    }

    rec.deliveredQuantity = input.receivedQuantity + input.damagedQuantity;
    rec.receivedQuantity = input.receivedQuantity;
    rec.damagedQuantity = input.damagedQuantity;
    rec.shortQuantity = input.shortQuantity;
    rec.remainingQuantity = remaining;
    rec.remarks = input.remarks;
    rec.challanFileName = input.challanFileName || rec.challanFileName;
    if (input.photoUrls.length > 0) {
      rec.photoUrls = [...rec.photoUrls, ...input.photoUrls];
    }
    rec.status = nextStatus;

    // Crucial business rule: supervisor delivery submission does NOT automatically post to inventory!
    rec.inventoryPosted = false;

    if (input.captureGps && ctx.policy.enableGpsCapture) {
      rec.gpsCaptureInfo = {
        captured: true,
        accuracyMeters: 12,
        capturedAt: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        note: 'Site delivery zone capture (Demo Session)',
      };
    } else {
      rec.gpsCaptureInfo = {
        captured: false,
        note: ctx.policy.enableGpsCapture
          ? 'GPS capture skipped by user'
          : 'GPS capture disabled by company policy',
      };
    }

    appendAuditLog(
      db,
      ctx,
      'RECORD_MATERIAL_DELIVERY',
      'MaterialReceipt',
      rec.id,
      `Recorded delivery for ${rec.purchaseOrderCode}: received=${input.receivedQuantity} ${rec.unit}, damaged=${input.damagedQuantity}, inventoryPosted=false`
    );

    saveDb(db);
    return simulateLatency({ ...rec });
  },

  async verifyInventoryPosting(ctx: AuthContext, receiptId: string): Promise<MaterialReceipt> {
    assertPermission(ctx, 'verify_inventory_receipt');
    const db = loadDb();
    const rec = db.materialReceipts.find((r) => r.id === receiptId);
    if (!rec) throw new Error('Material receipt record not found.');
    assertTenantScope(ctx, rec);

    rec.status = rec.remainingQuantity > 0 ? 'Partially Received' : 'Fully Received';
    rec.inventoryPosted = true;
    rec.verifiedBy = ctx.user.name;
    rec.verifiedAt = 'Just now';

    appendAuditLog(
      db,
      ctx,
      'VERIFY_INVENTORY_RECEIPT',
      'MaterialReceipt',
      rec.id,
      `Verified & posted ${rec.receivedQuantity} ${rec.unit} of ${rec.materialName} to site inventory.`
    );

    saveDb(db);
    return simulateLatency({ ...rec });
  },
};
