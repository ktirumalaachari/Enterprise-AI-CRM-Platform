import { Response } from 'express';
import { z } from 'zod';
import { Deal, DealStage } from '../models/Deal';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { LoggerService } from '../services/loggerService';
import { Types } from 'mongoose';
import { KpiSetting } from '../models/KpiSetting';

const stageProbabilityMap: Record<DealStage, number> = {
  Lead: 10,
  Contacted: 25,
  Proposal: 50,
  Negotiation: 75,
  Won: 100,
  Lost: 0,
};

const createDealSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  customer: z.string().min(1, 'Associated customer ID is required'),
  value: z.number().min(0, 'Value must be positive'),
  stage: z.enum(['Lead', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost']).default('Lead'),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  assignedTo: z.string().optional(),
  teamId: z.string().optional(),
});

export const getDeals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { search, stage, assignedTo } = req.query;

    const query: any = {};

    // Multi-tenant company isolation filter (unless SUPER_ADMIN)
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'SuperAdmin') {
      const activeCompanyId = req.companyId || req.user.companyId;
      if (activeCompanyId) {
        query.companyId = new Types.ObjectId(activeCompanyId);
      }
    }

    if (stage && stage !== 'All') {
      query.stage = stage;
    }
    if (assignedTo && assignedTo !== 'All') {
      query.assignedTo = new Types.ObjectId(String(assignedTo));
    }
    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      query.title = searchRegex;
    }

    const deals = await Deal.find(query)
      .populate('customer', 'name email company phone status value')
      .populate('assignedTo', 'name email avatar role')
      .sort({ updatedAt: -1 });

    // Summarize totals per stage for Kanban column headers
    const stageSummaries: Record<string, { count: number; totalValue: number }> = {
      Lead: { count: 0, totalValue: 0 },
      Contacted: { count: 0, totalValue: 0 },
      Proposal: { count: 0, totalValue: 0 },
      Negotiation: { count: 0, totalValue: 0 },
      Won: { count: 0, totalValue: 0 },
      Lost: { count: 0, totalValue: 0 },
    };

    deals.forEach((deal) => {
      if (stageSummaries[deal.stage]) {
        stageSummaries[deal.stage].count += 1;
        stageSummaries[deal.stage].totalValue += deal.value;
      }
    });

    res.status(200).json({ deals, stageSummaries });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch deals', error: error.message });
  }
};

export const createDeal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const validation = createDealSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ message: 'Validation failed', errors: validation.error.flatten().fieldErrors });
      return;
    }

    const data = validation.data;
    const probability = data.probability !== undefined ? data.probability : stageProbabilityMap[data.stage];
    const activeCompanyId = req.companyId || req.user.companyId;

    const newDeal = await Deal.create({
      title: data.title,
      customer: new Types.ObjectId(data.customer),
      value: data.value,
      stage: data.stage,
      probability,
      expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : undefined,
      assignedTo: data.assignedTo ? new Types.ObjectId(data.assignedTo) : undefined,
      teamId: data.teamId ? new Types.ObjectId(data.teamId) : undefined,
      companyId: activeCompanyId ? new Types.ObjectId(activeCompanyId) : undefined,
    });

    await LoggerService.log(req.user.id, 'DEAL_CREATE', { dealId: newDeal.id, title: newDeal.title, value: newDeal.value });

    const populated = await Deal.findById(newDeal.id)
      .populate('customer', 'name email company')
      .populate('assignedTo', 'name email avatar role');

    res.status(201).json({ message: 'Deal created successfully', deal: populated });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create deal', error: error.message });
  }
};

export const updateDealStage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { stage } = req.body;

    if (!['Lead', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost'].includes(stage)) {
      res.status(400).json({ message: 'Invalid stage value' });
      return;
    }

    const targetStage = stage as DealStage;
    const probability = stageProbabilityMap[targetStage];

    const query: any = { _id: id };
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'SuperAdmin') {
      const activeCompanyId = req.companyId || req.user.companyId;
      if (activeCompanyId) query.companyId = new Types.ObjectId(activeCompanyId);
    }

    const deal = await Deal.findOneAndUpdate(
      query,
      { stage: targetStage, probability },
      { new: true }
    ).populate('customer', 'name email company')
     .populate('assignedTo', 'name email avatar role');

    if (!deal) {
      res.status(404).json({ message: 'Deal not found or unauthorized' });
      return;
    }

    await LoggerService.log(req.user.id, 'DEAL_STAGE_UPDATE', { dealId: deal.id, newStage: targetStage });

    res.status(200).json({ message: 'Deal stage updated', deal });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update deal stage', error: error.message });
  }
};

export const updateDeal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.customer) updateData.customer = new Types.ObjectId(String(updateData.customer));
    if (updateData.assignedTo) updateData.assignedTo = new Types.ObjectId(String(updateData.assignedTo));

    const query: any = { _id: id };
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'SuperAdmin') {
      const activeCompanyId = req.companyId || req.user.companyId;
      if (activeCompanyId) query.companyId = new Types.ObjectId(activeCompanyId);
    }

    const deal = await Deal.findOneAndUpdate(query, updateData, { new: true })
      .populate('customer', 'name email company')
      .populate('assignedTo', 'name email avatar role');

    if (!deal) {
      res.status(404).json({ message: 'Deal not found or unauthorized' });
      return;
    }

    await LoggerService.log(req.user.id, 'DEAL_UPDATE', { dealId: deal.id });

    res.status(200).json({ message: 'Deal updated successfully', deal });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update deal', error: error.message });
  }
};

export const deleteDeal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const query: any = { _id: id };
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'SuperAdmin') {
      const activeCompanyId = req.companyId || req.user.companyId;
      if (activeCompanyId) query.companyId = new Types.ObjectId(activeCompanyId);
    }

    const deal = await Deal.findOneAndDelete(query);

    if (!deal) {
      res.status(404).json({ message: 'Deal not found or unauthorized' });
      return;
    }

    await LoggerService.log(req.user.id, 'DEAL_DELETE', { dealId: id, title: deal.title });

    res.status(200).json({ message: 'Deal deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete deal', error: error.message });
  }
};

export const getSalesAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const query: any = {};
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'SuperAdmin') {
      const activeCompanyId = req.companyId || req.user.companyId;
      if (activeCompanyId) query.companyId = new Types.ObjectId(activeCompanyId);
    }

    const deals = await Deal.find(query).populate('assignedTo', 'name email avatar');

    // Fetch manual KPI settings override
    let kpiDoc = await KpiSetting.findOne();
    if (!kpiDoc) {
      kpiDoc = await KpiSetting.create({
        closedRevenue: 0,
        activePipeline: 0,
        winRate: 0,
        avgDealSize: 0,
      });
    }

    let totalClosedRevenue = 0;
    let activePipelineValue = 0;
    let wonCount = 0;
    let lostCount = 0;

    const stageBreakdown: Record<string, { count: number; value: number }> = {
      Lead: { count: 0, value: 0 },
      Contacted: { count: 0, value: 0 },
      Proposal: { count: 0, value: 0 },
      Negotiation: { count: 0, value: 0 },
      Won: { count: 0, value: 0 },
      Lost: { count: 0, value: 0 },
    };

    const repPerformance: Record<string, { name: string; avatar?: string; wonValue: number; dealsCount: number }> = {};

    // Monthly revenue trajectory (past 6 months)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthlyDataMap: Record<string, { month: string; Revenue: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} '${d.getFullYear().toString().slice(-2)}`;
      monthlyDataMap[key] = { month: key, Revenue: 0 };
    }

    deals.forEach((deal) => {
      const val = deal.value || 0;
      if (stageBreakdown[deal.stage]) {
        stageBreakdown[deal.stage].count += 1;
        stageBreakdown[deal.stage].value += val;
      }

      if (deal.stage === 'Won') {
        totalClosedRevenue += val;
        wonCount += 1;

        // Group into monthly trajectory
        const dealDate = deal.createdAt ? new Date(deal.createdAt) : new Date();
        const monthKey = `${monthNames[dealDate.getMonth()]} '${dealDate.getFullYear().toString().slice(-2)}`;
        if (monthlyDataMap[monthKey]) {
          monthlyDataMap[monthKey].Revenue += val;
        } else {
          monthlyDataMap[monthKey] = { month: monthKey, Revenue: val };
        }
      } else if (deal.stage === 'Lost') {
        lostCount += 1;
      } else {
        activePipelineValue += val;
      }

      // Rep leaderboard tracking safely guarded against missing/deleted users
      if (deal.assignedTo && typeof deal.assignedTo === 'object') {
        const rep = deal.assignedTo as any;
        const repId = rep._id ? rep._id.toString() : (rep.id ? rep.id.toString() : null);
        if (repId) {
          if (!repPerformance[repId]) {
            repPerformance[repId] = { name: rep.name || 'Sales Rep', avatar: rep.avatar, wonValue: 0, dealsCount: 0 };
          }
          repPerformance[repId].dealsCount += 1;
          if (deal.stage === 'Won') {
            repPerformance[repId].wonValue += val;
          }
        }
      }
    });

    const monthlyData = Object.values(monthlyDataMap);

    res.status(200).json({
      analytics: {
        totalClosedRevenue: kpiDoc.closedRevenue || totalClosedRevenue,
        activePipelineValue: kpiDoc.activePipeline || activePipelineValue,
        wonCount,
        lostCount,
        totalDeals: deals.length,
        winRate: kpiDoc.winRate || (deals.length ? Math.round((wonCount / deals.length) * 100) : 0),
        avgDealSize: kpiDoc.avgDealSize || (deals.length ? Math.round(totalClosedRevenue / (wonCount || 1)) : 0),
        stageBreakdown,
        leaderboard: Object.values(repPerformance).sort((a, b) => b.wonValue - a.wonValue),
        monthlyData,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to generate sales analytics', error: error.message });
  }
};
