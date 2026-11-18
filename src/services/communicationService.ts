import {
  appendAuditLog,
  loadDb,
  matchesTenantAndCrew,
  saveDb,
  simulateLatency,
} from '@/src/services/mockApiClient';
import { assertTenantScope, type AuthContext } from '@/src/services/policyService';
import type { Notification, SiteDocument, SiteMessage, User } from '@/src/types/models';

export const communicationService = {
  async listNotifications(ctx: AuthContext): Promise<Notification[]> {
    const db = loadDb();
    return simulateLatency(
      db.notifications.filter((n) => matchesTenantAndCrew(ctx, n))
    );
  },

  async markNotificationRead(ctx: AuthContext, notifId: string): Promise<void> {
    const db = loadDb();
    const item = db.notifications.find((n) => n.id === notifId);
    if (!item) return;
    assertTenantScope(ctx, item);
    item.read = true;
    saveDb(db);
  },

  async markAllNotificationsRead(ctx: AuthContext): Promise<void> {
    const db = loadDb();
    for (const n of db.notifications) {
      if (matchesTenantAndCrew(ctx, n)) {
        n.read = true;
      }
    }
    saveDb(db);
  },

  async listMessages(ctx: AuthContext): Promise<SiteMessage[]> {
    const db = loadDb();
    return simulateLatency(
      db.messages.filter((m) => matchesTenantAndCrew(ctx, m))
    );
  },

  async sendMessage(
    ctx: AuthContext,
    input: { type: 'Reply' | 'Escalation'; subject: string; body: string }
  ): Promise<SiteMessage> {
    const db = loadDb();
    const msg: SiteMessage = {
      id: `msg-${Date.now()}`,
      companyId: ctx.companyId,
      projectId: ctx.projectId,
      siteId: ctx.siteId,
      senderId: ctx.user.id,
      senderName: ctx.user.name,
      senderRole: ctx.user.designation,
      type: input.type,
      subject: input.subject.trim(),
      body: input.body.trim(),
      timestamp: 'Just now',
      acknowledgedByIds: [ctx.user.id],
    };
    assertTenantScope(ctx, msg);
    db.messages.unshift(msg);
    appendAuditLog(
      db,
      ctx,
      'SEND_SITE_MESSAGE',
      'SiteMessage',
      msg.id,
      `${input.type}: ${msg.subject}`
    );
    saveDb(db);
    return simulateLatency(msg);
  },

  async acknowledgeMessage(ctx: AuthContext, messageId: string): Promise<void> {
    const db = loadDb();
    const msg = db.messages.find((m) => m.id === messageId);
    if (!msg) return;
    assertTenantScope(ctx, msg);
    if (!msg.acknowledgedByIds.includes(ctx.user.id)) {
      msg.acknowledgedByIds.push(ctx.user.id);
    }
    saveDb(db);
  },

  async listDocuments(ctx: AuthContext): Promise<SiteDocument[]> {
    const db = loadDb();
    return simulateLatency(
      db.documents.filter((d) => matchesTenantAndCrew(ctx, d))
    );
  },

  async uploadDocument(
    ctx: AuthContext,
    input: { title: string; category: SiteDocument['category']; fileName: string; summary: string }
  ): Promise<SiteDocument> {
    const db = loadDb();
    const doc: SiteDocument = {
      id: `doc-${Date.now()}`,
      companyId: ctx.companyId,
      projectId: ctx.projectId,
      siteId: ctx.siteId,
      title: input.title.trim(),
      category: input.category,
      fileName: input.fileName,
      fileSizeLabel: '1.2 MB',
      uploadedBy: ctx.user.name,
      uploadedAt: '2026-11-18',
      version: 'v1.0',
      accessLevel: 'Supervisor Permitted',
      summary: input.summary.trim(),
    };
    assertTenantScope(ctx, doc);
    db.documents.unshift(doc);
    appendAuditLog(db, ctx, 'UPLOAD_SITE_DOCUMENT', 'SiteDocument', doc.id, doc.title);
    saveDb(db);
    return simulateLatency(doc);
  },

  async updateOwnContact(
    ctx: AuthContext,
    input: { phone: string; emergencyContact: string }
  ): Promise<User> {
    const db = loadDb();
    const user = db.users.find((u) => u.id === ctx.user.id);
    if (!user) throw new Error('User not found.');
    user.phone = input.phone.trim();
    user.emergencyContact = input.emergencyContact.trim();
    appendAuditLog(
      db,
      ctx,
      'UPDATE_PROFILE_CONTACT',
      'User',
      user.id,
      'Updated personal contact and emergency number.'
    );
    saveDb(db);
    return simulateLatency({ ...user });
  },
};
