import { Schema, model, Document, Types } from 'mongoose';

export type DealStage = 'Lead' | 'Contacted' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';

export interface IDealNote {
  content: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export interface IDeal extends Document {
  title: string;
  customer: Types.ObjectId;
  value: number;
  stage: DealStage;
  probability: number;
  expectedCloseDate?: Date;
  assignedTo?: Types.ObjectId;
  teamId?: Types.ObjectId;
  companyId?: Types.ObjectId;
  notes: IDealNote[];
  createdAt: Date;
  updatedAt: Date;
}

const dealNoteSchema = new Schema<IDealNote>(
  {
    content: {
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const dealSchema = new Schema<IDeal>(
  {
    title: {
      type: String,
      required: [true, 'Deal title is required'],
      trim: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Associated customer is required'],
    },
    value: {
      type: Number,
      required: [true, 'Deal value is required'],
      min: 0,
    },
    stage: {
      type: String,
      enum: ['Lead', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost'],
      default: 'Lead',
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 10,
    },
    expectedCloseDate: {
      type: Date,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    notes: [dealNoteSchema],
  },
  {
    timestamps: true,
  }
);

export const Deal = model<IDeal>('Deal', dealSchema);
export default Deal;
