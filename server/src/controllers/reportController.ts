import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Deal } from '../models/Deal';
import { Customer } from '../models/Customer';
import { User } from '../models/User';
import { ActivityLog } from '../models/ActivityLog';
import { Task } from '../models/Task';
import { KpiSetting } from '../models/KpiSetting';

// -----------------------------------------------------------
// GET /api/reports/kpis — retrieve manually configured KPIs
// -----------------------------------------------------------
export const getKpis = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let kpis = await KpiSetting.findOne();
    if (!kpis) {
      kpis = await KpiSetting.create({
        closedRevenue: 0,
        activePipeline: 0,
        winRate: 0,
        avgDealSize: 0,
      });
    }
    res.status(200).json({ kpis });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to retrieve KPI metrics', error: error.message });
  }
};

// -----------------------------------------------------------
// PUT /api/reports/kpis — update manually configured KPIs (Admin/SuperAdmin)
// -----------------------------------------------------------
export const updateKpis = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { closedRevenue, activePipeline, winRate, avgDealSize } = req.body;
    let kpis = await KpiSetting.findOne();
    if (!kpis) {
      kpis = new KpiSetting();
    }

    kpis.closedRevenue = Number(closedRevenue) || 0;
    kpis.activePipeline = Number(activePipeline) || 0;
    kpis.winRate = Number(winRate) || 0;
    kpis.avgDealSize = Number(avgDealSize) || 0;

    await kpis.save();
    res.status(200).json({ message: 'KPI metrics updated successfully', kpis });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update KPI metrics', error: error.message });
  }
};

// -----------------------------------------------------------
// GET /api/reports/summary — aggregated metrics for dashboard
// -----------------------------------------------------------
export const getReportSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query;

    const dateFilter: any = {};
    if (from) dateFilter.$gte = new Date(String(from));
    if (to)   dateFilter.$lte = new Date(String(to));

    const dealQuery: any = {};
    if (from || to) dealQuery.createdAt = dateFilter;

    // Fetch manual KPI settings override
    let kpis = await KpiSetting.findOne();
    if (!kpis) {
      kpis = await KpiSetting.create({
        closedRevenue: 0,
        activePipeline: 0,
        winRate: 0,
        avgDealSize: 0,
      });
    }

    // Won deals
    const wonDeals = await Deal.find({ ...dealQuery, stage: 'Won' });

    // Pipeline stages breakdown
    const stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
    const pipelineBreakdown = await Promise.all(
      stages.map(async (stage) => {
        const count = await Deal.countDocuments({ ...dealQuery, stage });
        const deals = await Deal.find({ ...dealQuery, stage });
        const value = deals.reduce((sum, d) => sum + (d.value || 0), 0);
        return { stage, count, value };
      })
    );

    // Total counts
    const totalDeals = await Deal.countDocuments(dealQuery);
    const totalCustomers = await Customer.countDocuments(from || to ? { createdAt: dateFilter } : {});
    const totalUsers = await User.countDocuments();
    const totalTasks = await Task.countDocuments(from || to ? { createdAt: dateFilter } : {});
    const completedTasks = await Task.countDocuments({
      ...(from || to ? { createdAt: dateFilter } : {}),
      status: 'Completed',
    });

    // Top performing deals
    const topDeals = await Deal.find({ ...dealQuery, stage: 'Won' })
      .sort({ value: -1 })
      .limit(5)
      .populate('customer', 'name company')
      .populate('assignedTo', 'name email');

    // Recent activity count by user
    const activityByUser = await ActivityLog.aggregate([
      ...(from || to ? [{ $match: { createdAt: dateFilter } }] : []),
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.status(200).json({
      summary: {
        totalRevenue: kpis.closedRevenue,
        totalDeals,
        totalCustomers,
        totalUsers,
        totalTasks,
        completedTasks,
        taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        wonDealsCount: wonDeals.length,
        winRate: kpis.winRate,
      },
      pipelineBreakdown,
      topDeals,
      activityByUser,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to generate report summary', error: error.message });
  }
};

// -----------------------------------------------------------
// GET /api/reports/export?format=csv|json — raw data export
// -----------------------------------------------------------
export const exportReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { format = 'csv', type = 'deals', from, to } = req.query;

    const dateFilter: any = {};
    if (from) dateFilter.$gte = new Date(String(from));
    if (to)   dateFilter.$lte = new Date(String(to));
    const hasDateFilter = !!(from || to);

    let rawData: any[] = [];
    let filename = 'crm-export';

    if (type === 'deals') {
      const docs = await Deal.find(hasDateFilter ? { createdAt: dateFilter } : {})
        .populate('customer', 'name company email')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 });

      rawData = docs.map((d) => ({
        id: d._id,
        title: d.title,
        stage: d.stage,
        value: d.value,
        probability: d.probability,
        customer: (d.customer as any)?.name || 'N/A',
        company: (d.customer as any)?.company || 'N/A',
        assignedTo: (d.assignedTo as any)?.name || 'N/A',
        createdAt: d.createdAt,
      }));
      filename = 'deals-export';
    } else if (type === 'customers') {
      const docs = await Customer.find(hasDateFilter ? { createdAt: dateFilter } : {})
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 });

      rawData = docs.map((c) => ({
        id: c._id,
        name: c.name,
        email: c.email,
        company: c.company || 'N/A',
        phone: c.phone || 'N/A',
        status: c.status,
        value: c.value || 0,
        assignedTo: (c.assignedTo as any)?.name || 'N/A',
        createdAt: c.createdAt,
      }));
      filename = 'customers-export';
    } else if (type === 'activities') {
      const docs = await ActivityLog.find(hasDateFilter ? { createdAt: dateFilter } : {})
        .populate('userId', 'name email role')
        .sort({ createdAt: -1 })
        .limit(500);

      rawData = docs.map((a) => ({
        id: a._id,
        user: (a.userId as any)?.name || 'N/A',
        email: (a.userId as any)?.email || 'N/A',
        action: a.action,
        createdAt: a.createdAt,
      }));
      filename = 'activity-logs-export';
    }

    if (String(format) === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.status(200).json(rawData);
      return;
    }

    // CSV export
    if (rawData.length === 0) {
      res.status(200).send('No data available for the selected filters.');
      return;
    }

    const headers = Object.keys(rawData[0]);
    const csvRows = [
      headers.join(','),
      ...rawData.map((row) =>
        headers.map((h) => {
          const val = row[h];
          const str = val === null || val === undefined ? '' : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        }).join(',')
      ),
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.status(200).send(csvRows.join('\n'));
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to export report', error: error.message });
  }
};
