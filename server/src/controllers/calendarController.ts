import { Response } from 'express';
import { z } from 'zod';
import { Event } from '../models/Event';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { LoggerService } from '../services/loggerService';
import { Types } from 'mongoose';

const createEventSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  type: z.enum(['Meeting', 'Call', 'Demo', 'Follow-up']).default('Meeting'),
  customer: z.string().optional(),
  deal: z.string().optional(),
  location: z.string().optional(),
});

export const getEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const events = await Event.find()
      .populate('customer', 'name company email')
      .populate('deal', 'title value stage')
      .populate('createdBy', 'name email avatar')
      .sort({ startTime: 1 });

    res.status(200).json({ events });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch calendar events', error: error.message });
  }
};

export const createEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const validation = createEventSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ message: 'Validation failed', errors: validation.error.flatten().fieldErrors });
      return;
    }

    const data = validation.data;

    const newEvent = await Event.create({
      title: data.title,
      description: data.description,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      type: data.type,
      customer: data.customer ? new Types.ObjectId(data.customer) : undefined,
      deal: data.deal ? new Types.ObjectId(data.deal) : undefined,
      location: data.location,
      createdBy: new Types.ObjectId(req.user.id),
    });

    await LoggerService.log(req.user.id, 'CALENDAR_EVENT_CREATE', { eventId: newEvent.id, title: newEvent.title });

    const populated = await Event.findById(newEvent.id)
      .populate('customer', 'name company email')
      .populate('deal', 'title value stage')
      .populate('createdBy', 'name email avatar');

    res.status(201).json({ message: 'Event scheduled successfully', event: populated });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to schedule event', error: error.message });
  }
};

export const deleteEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const event = await Event.findByIdAndDelete(id);

    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    res.status(200).json({ message: 'Event cancelled successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete event', error: error.message });
  }
};
