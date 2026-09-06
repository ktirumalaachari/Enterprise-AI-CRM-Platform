import { Schema, model, Document } from 'mongoose';

export interface IKpiSetting extends Document {
  closedRevenue: number;
  activePipeline: number;
  winRate: number;
  avgDealSize: number;
  createdAt: Date;
  updatedAt: Date;
}

const kpiSettingSchema = new Schema<IKpiSetting>(
  {
    closedRevenue: { type: Number, default: 0 },
    activePipeline: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    avgDealSize: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const KpiSetting = model<IKpiSetting>('KpiSetting', kpiSettingSchema);
export default KpiSetting;
