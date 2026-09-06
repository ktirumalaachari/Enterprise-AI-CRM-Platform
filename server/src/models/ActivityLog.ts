import { Schema, model, Document, Types } from 'mongoose';

export interface IActivityLog extends Document {
  userId: Types.ObjectId;
  companyId?: Types.ObjectId;
  action: string;
  details: Schema.Types.Mixed;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only need logging timestamp
  }
);

export const ActivityLog = model<IActivityLog>('ActivityLog', activityLogSchema);
export default ActivityLog;
