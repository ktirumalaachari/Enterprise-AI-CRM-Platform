import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'COMPANY_OWNER'
  | 'SALES_MANAGER'
  | 'SALES_REPRESENTATIVE'
  // Legacy role aliases for backward compatibility:
  | 'SuperAdmin'
  | 'Admin'
  | 'SalesManager'
  | 'SalesRep';

export type AccountStatus = 'PENDING' | 'PENDING_COMPANY' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

export interface IUserCompanyMembership {
  companyId: Types.ObjectId;
  role: UserRole;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  companyId?: Types.ObjectId;
  companies: IUserCompanyMembership[];
  accountStatus: AccountStatus;
  invitedBy?: Types.ObjectId;
  avatar?: string;
  googleId?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  lastLogin?: Date;
  emailOtp?: string;
  emailOtpExpires?: Date;
  pendingEmail?: string;
  isVerified: boolean;
  subscription: {
    plan: 'trial' | 'basic' | 'medium' | 'premium';
    status: 'trial' | 'active' | 'expired';
    startDate?: Date;
    endDate?: Date;
    trialStartDate?: Date;
    trialEndDate?: Date;
    paymentId?: string;
    orderId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      select: false, // Don't return password by default in queries
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    role: {
      type: String,
      enum: [
        'SUPER_ADMIN',
        'COMPANY_OWNER',
        'SALES_MANAGER',
        'SALES_REPRESENTATIVE',
        'SuperAdmin',
        'Admin',
        'SalesRep',
      ],
      default: 'SALES_REPRESENTATIVE',
      index: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    companies: [
      {
        companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
        role: { type: String },
      },
    ],
    accountStatus: {
      type: String,
      enum: ['PENDING', 'PENDING_COMPANY', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REJECTED'],
      default: 'PENDING_COMPANY',
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    avatar: {
      type: String,
      default: '',
    },
    googleId: {
      type: String,
      sparse: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    company: {
      type: String,
      default: '',
      trim: true,
    },
    jobTitle: {
      type: String,
      default: '',
      trim: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    emailOtp: {
      type: String,
      select: false,
    },
    emailOtpExpires: {
      type: Date,
      select: false,
    },
    pendingEmail: {
      type: String,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    subscription: {
      plan: {
        type: String,
        enum: ['trial', 'basic', 'medium', 'premium'],
        default: 'trial',
      },
      status: {
        type: String,
        enum: ['trial', 'active', 'expired'],
        default: 'trial',
      },
      startDate: { type: Date },
      endDate: { type: Date },
      trialStartDate: {
        type: Date,
        default: Date.now,
      },
      trialEndDate: {
        type: Date,
        default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      paymentId: { type: String, default: '' },
      orderId: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: normalize legacy roles to official uppercase role structure
userSchema.pre<IUser>('save', async function (next) {
  if (this.isModified('role')) {
    if (this.role === 'SuperAdmin') this.role = 'SUPER_ADMIN';
    if (this.role === 'Admin') this.role = 'COMPANY_OWNER';
    if (this.role === 'SalesRep') this.role = 'SALES_REPRESENTATIVE';
    if (this.role === 'SalesManager') this.role = 'SALES_MANAGER';
  }

  if (!this.isModified('password')) return next();
  if (!this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<IUser>('User', userSchema);
export default User;
