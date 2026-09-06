import { Schema, model, Document, Types } from 'mongoose';

export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export interface ITask extends Document {
  title: string;
  description?: string;
  dueDate?: Date;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo?: Types.ObjectId;
  customer?: Types.ObjectId;
  deal?: Types.ObjectId;
  createdBy: Types.ObjectId;
  companyId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
    },
    description: {
      type: String,
    },
    dueDate: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    deal: {
      type: Schema.Types.ObjectId,
      ref: 'Deal',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Task = model<ITask>('Task', taskSchema);
export default Task;
