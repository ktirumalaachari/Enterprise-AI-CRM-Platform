import { ActivityLog } from '../models/ActivityLog';
import { Notification } from '../models/Notification';
import { Types } from 'mongoose';

export class LoggerService {
  static async log(userId: string, action: string, details: any = {}): Promise<void> {
    try {
      // 1. Write Activity Log for Audit Timeline
      await ActivityLog.create({
        userId: new Types.ObjectId(userId),
        action,
        details,
      });

      // 2. Generate User Notification
      let notifTitle = 'System Update';
      let notifMessage = `Action ${action} executed successfully.`;
      let notifType: 'info' | 'success' | 'warning' | 'deal' | 'task' = 'info';

      if (action.includes('DEAL')) {
        notifType = 'deal';
        notifTitle = action === 'DEAL_CREATE' ? 'New Sales Deal' : 'Deal Pipeline Update';
        notifMessage = details.title 
          ? `Deal "${details.title}" ($${details.value || 0}) updated.`
          : `Sales opportunity updated in pipeline.`;
      } else if (action.includes('TASK')) {
        notifType = 'task';
        notifTitle = 'Task Assigned';
        notifMessage = details.title ? `Task "${details.title}" updated.` : `Task action recorded.`;
      } else if (action.includes('CUSTOMER') || action.includes('LEAD')) {
        notifType = 'success';
        notifTitle = 'Customer Lead Update';
        notifMessage = details.name ? `Contact "${details.name}" updated.` : `Lead recorded in pipeline.`;
      } else if (action.includes('TEAM') || action.includes('INVITE')) {
        notifType = 'info';
        notifTitle = 'Team Notification';
        notifMessage = details.email ? `Team invite sent to ${details.email}.` : `Team action performed.`;
      }

      await Notification.create({
        user: new Types.ObjectId(userId),
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        isRead: false,
      });
    } catch (error) {
      console.error('LoggerService failed to write audit log or notification:', error);
    }
  }
}

export default LoggerService;
