import { Response } from 'express';
import { ActivityLog } from '../models/ActivityLog';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export const getActivityLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { limit = '30', page = '1' } = req.query;

    const parsedLimit = Math.max(1, parseInt(String(limit), 10));
    const parsedPage = Math.max(1, parseInt(String(page), 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const logs = await ActivityLog.find()
      .populate('userId', 'name email avatar role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit);

    const total = await ActivityLog.countDocuments();

    res.status(200).json({
      logs,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit),
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch activity logs', error: error.message });
  }
};
export default getActivityLogs;
