import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  user: Types.ObjectId;
  companyId?: Types.ObjectId;
  type: 'info' | 'success' | 'warning' | 'deal' | 'task';
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'deal', 'task'],
      default: 'info',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Notification = model<INotification>('Notification', notificationSchema);
export default Notification;
