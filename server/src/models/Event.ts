import { Schema, model, Document, Types } from 'mongoose';

export type EventType = 'Meeting' | 'Call' | 'Demo' | 'Follow-up';

export interface IEvent extends Document {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  type: EventType;
  customer?: Types.ObjectId;
  deal?: Types.ObjectId;
  createdBy: Types.ObjectId;
  location?: string;
  companyId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    description: {
      type: String,
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    type: {
      type: String,
      enum: ['Meeting', 'Call', 'Demo', 'Follow-up'],
      default: 'Meeting',
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    deal: {
      type: Schema.Types.ObjectId,
      ref: 'Deal',
    },
    location: {
      type: String,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Event = model<IEvent>('Event', eventSchema);
export default Event;
