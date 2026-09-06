/**
 * Audit Service — reusable, fire-and-forget audit log writer.
 * Never blocks the caller — errors are caught and logged to console only.
 */
import { ActivityLog } from '../models/ActivityLog';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'google_login'
  | 'register'
  | 'avatar_upload'
  | 'avatar_delete'
  | 'email_change_requested'
  | 'email_change_verified'
  | 'password_changed'
  | 'profile_updated'
  | 'account_deleted'
  | 'logout_all_devices'
  | 'failed_login'
  | 'role_changed';

interface AuditMeta {
  ip?: string;
  userAgent?: string;
  details?: string;
  [key: string]: unknown;
}

/**
 * Creates an audit log entry. Fire-and-forget — does NOT throw.
 */
export async function createAuditLog(
  userId: string,
  action: AuditAction,
  meta: AuditMeta = {}
): Promise<void> {
  try {
    await ActivityLog.create({
      userId,
      action,
      details: {
        summary: meta.details || action,
        ip: meta.ip,
        userAgent: meta.userAgent,
        ...meta,
      },
    });
  } catch (err: any) {
    // Audit failure must NEVER interrupt the business flow
    console.error('[AuditService] Failed to write audit log:', err.message);
  }
}
