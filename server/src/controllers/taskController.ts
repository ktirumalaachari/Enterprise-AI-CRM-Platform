import { Response } from 'express';
import { z } from 'zod';
import { Task } from '../models/Task';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { LoggerService } from '../services/loggerService';
import { Types } from 'mongoose';

const createTaskSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  status: z.enum(['Pending', 'In Progress', 'Completed']).default('Pending'),
  assignedTo: z.string().optional(),
  customer: z.string().optional(),
  deal: z.string().optional(),
});

export const getTasks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { status, priority, search } = req.query;

    const query: any = {};
    if (status && status !== 'All') {
      query.status = status;
    }
    if (priority && priority !== 'All') {
      query.priority = priority;
    }
    if (search) {
      query.title = new RegExp(String(search), 'i');
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email avatar')
      .populate('customer', 'name company email')
      .populate('deal', 'title value stage')
      .sort({ dueDate: 1, createdAt: -1 });

    res.status(200).json({ tasks });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch tasks', error: error.message });
  }
};

export const createTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const validation = createTaskSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ message: 'Validation failed', errors: validation.error.flatten().fieldErrors });
      return;
    }

    const data = validation.data;

    const newTask = await Task.create({
      title: data.title,
      description: data.description,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      priority: data.priority,
      status: data.status,
      assignedTo: data.assignedTo ? new Types.ObjectId(data.assignedTo) : undefined,
      customer: data.customer ? new Types.ObjectId(data.customer) : undefined,
      deal: data.deal ? new Types.ObjectId(data.deal) : undefined,
      createdBy: new Types.ObjectId(req.user.id),
    });

    await LoggerService.log(req.user.id, 'TASK_CREATE', { taskId: newTask.id, title: newTask.title });

    const populated = await Task.findById(newTask.id)
      .populate('assignedTo', 'name email avatar')
      .populate('customer', 'name company email')
      .populate('deal', 'title value stage');

    res.status(201).json({ message: 'Task created successfully', task: populated });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create task', error: error.message });
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.assignedTo) updateData.assignedTo = new Types.ObjectId(String(updateData.assignedTo));
    if (updateData.customer) updateData.customer = new Types.ObjectId(String(updateData.customer));
    if (updateData.deal) updateData.deal = new Types.ObjectId(String(updateData.deal));

    const task = await Task.findByIdAndUpdate(id, updateData, { new: true })
      .populate('assignedTo', 'name email avatar')
      .populate('customer', 'name company email')
      .populate('deal', 'title value stage');

    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    res.status(200).json({ message: 'Task updated successfully', task });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update task', error: error.message });
  }
};

export const toggleTaskStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    task.status = status || (task.status === 'Completed' ? 'Pending' : 'Completed');
    await task.save();

    await LoggerService.log(req.user.id, 'TASK_STATUS_TOGGLE', { taskId: task.id, newStatus: task.status });

    res.status(200).json({ message: 'Task status updated', task });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to toggle task status', error: error.message });
  }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const task = await Task.findByIdAndDelete(id);

    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete task', error: error.message });
  }
};
