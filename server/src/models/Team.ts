import { Schema, model, Document, Types } from 'mongoose';

export interface ITeamMember {
  userId: Types.ObjectId;
  role: 'Admin' | 'Member';
}

export interface ITeam extends Document {
  name: string;
  ownerId: Types.ObjectId;
  companyId?: Types.ObjectId;
  members: ITeamMember[];
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true,
    },
    members: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['Admin', 'Member'],
          default: 'Member',
        },
        _id: false, // Don't generate default ObjectIds for list members
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Team = model<ITeam>('Team', teamSchema);
