import { Schema, model, Document, Types } from 'mongoose';

export interface ICustomerNote {
  content: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export type CustomerStatus = 'Lead' | 'Contacted' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';

export interface ICustomer extends Document {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: CustomerStatus;
  value: number;
  assignedTo?: Types.ObjectId;
  teamId?: Types.ObjectId;
  companyId?: Types.ObjectId;
  notes: ICustomerNote[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const customerNoteSchema = new Schema<ICustomerNote>(
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
    timestamps: { createdAt: true, updatedAt: false }
  }
);

const customerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: '',
    },
    company: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Lead', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost'],
      default: 'Lead',
    },
    value: {
      type: Number,
      default: 0,
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
    notes: [customerNoteSchema],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Customer = model<ICustomer>('Customer', customerSchema);
export default Customer;
