import { Response } from 'express';
import { z } from 'zod';
import { Customer } from '../models/Customer';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { LoggerService } from '../services/loggerService';
import { Types } from 'mongoose';

const customerCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().default(''),
  company: z.string().optional().default(''),
  status: z.enum(['Lead', 'Contacted', 'Proposal', 'Negotiation', 'Won', 'Lost']).default('Lead'),
  value: z.number().nonnegative('Value must be a positive number').default(0),
  assignedTo: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const noteSchema = z.object({
  content: z.string().min(1, 'Note content cannot be empty'),
});

export const createCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const validation = customerCreateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ message: 'Validation failed', errors: validation.error.flatten().fieldErrors });
      return;
    }

    const activeCompanyId = req.companyId || req.user.companyId;

    const customerData = {
      ...validation.data,
      assignedTo: validation.data.assignedTo ? new Types.ObjectId(validation.data.assignedTo) : undefined,
      companyId: activeCompanyId ? new Types.ObjectId(activeCompanyId) : undefined,
    };

    const newCustomer = await Customer.create(customerData);

    await LoggerService.log(req.user.id, 'CUSTOMER_CREATE', { 
      customerId: newCustomer.id, 
      name: newCustomer.name, 
      value: newCustomer.value 
    });

    res.status(201).json({ message: 'Customer created successfully', customer: newCustomer });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create customer', error: error.message });
  }
};

export const getCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { search, status, assignedTo, limit = '50', page = '1' } = req.query;

    const query: any = {};

    // Multi-tenant company isolation filter (unless SUPER_ADMIN)
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'SuperAdmin') {
      const activeCompanyId = req.companyId || req.user.companyId;
      if (activeCompanyId) {
        query.companyId = new Types.ObjectId(activeCompanyId);
      }
    }

    // 1. Search Query Regex (Name, Email, Company)
    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { company: searchRegex },
      ];
    }

    // 2. Status Filter
    if (status && status !== 'All') {
      query.status = status;
    }

    // 3. Assignment Filter
    if (assignedTo && assignedTo !== 'All') {
      query.assignedTo = new Types.ObjectId(String(assignedTo));
    }

    const parsedLimit = Math.max(1, parseInt(String(limit), 10));
    const parsedPage = Math.max(1, parseInt(String(page), 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const customers = await Customer.find(query)
      .populate('assignedTo', 'name email avatar role')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parsedLimit);

    const total = await Customer.countDocuments(query);

    res.status(200).json({
      customers,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit),
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch customers', error: error.message });
  }
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const updateData = { ...req.body };
    if (updateData.assignedTo) {
      updateData.assignedTo = new Types.ObjectId(String(updateData.assignedTo));
    }

    const customer = await Customer.findOneAndUpdate(query, updateData, { new: true });
    if (!customer) {
      res.status(404).json({ message: 'Customer not found or unauthorized' });
      return;
    }

    await LoggerService.log(req.user.id, 'CUSTOMER_UPDATE', { 
      customerId: customer.id, 
      updates: Object.keys(req.body) 
    });

    res.status(200).json({ message: 'Customer updated successfully', customer });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update customer', error: error.message });
  }
};

export const addCustomerNote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const validation = noteSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({ message: 'Validation failed', errors: validation.error.flatten().fieldErrors });
      return;
    }

    const query: any = { _id: id };
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'SuperAdmin') {
      const activeCompanyId = req.companyId || req.user.companyId;
      if (activeCompanyId) query.companyId = new Types.ObjectId(activeCompanyId);
    }

    const customer = await Customer.findOne(query);
    if (!customer) {
      res.status(404).json({ message: 'Customer not found or unauthorized' });
      return;
    }

    const notePayload = {
      content: validation.data.content,
      createdBy: new Types.ObjectId(req.user.id),
      createdAt: new Date(),
    };

    customer.notes.push(notePayload);
    await customer.save();

    await LoggerService.log(req.user.id, 'CUSTOMER_NOTE_ADD', { customerId: customer.id });

    // Populate creator details on returning note
    const updatedCustomer = await Customer.findById(id)
      .populate('notes.createdBy', 'name email avatar');

    res.status(200).json({ message: 'Note added successfully', notes: updatedCustomer?.notes });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to add note', error: error.message });
  }
};

export const deleteCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const customer = await Customer.findOneAndDelete(query);
    if (!customer) {
      res.status(404).json({ message: 'Customer not found or unauthorized' });
      return;
    }

    await LoggerService.log(req.user.id, 'CUSTOMER_DELETE', { customerId: id, name: customer.name });

    res.status(200).json({ message: 'Customer deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete customer', error: error.message });
  }
};

export const importCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { customers } = req.body;
    if (!Array.isArray(customers) || customers.length === 0) {
      res.status(400).json({ message: 'Invalid payload. Array of customers required.' });
      return;
    }

    const activeCompanyId = req.companyId || req.user.companyId;

    const validatedCustomers: any[] = [];
    const errors: string[] = [];

    // Parse and structure each customer
    customers.forEach((c: any, index: number) => {
      try {
        const parsed = customerCreateSchema.parse({
          name: c.name || c.Name,
          email: c.email || c.Email,
          phone: c.phone || c.Phone || '',
          company: c.company || c.Company || '',
          status: c.status || c.Status || 'Lead',
          value: parseFloat(c.value || c.Value || '0'),
          tags: Array.isArray(c.tags) ? c.tags : (c.tags ? String(c.tags).split(',').map((t: string) => t.trim()) : []),
        });
        validatedCustomers.push({
          ...parsed,
          companyId: activeCompanyId ? new Types.ObjectId(activeCompanyId) : undefined,
        });
      } catch (err: any) {
        errors.push(`Row ${index + 1}: ${err.message}`);
      }
    });

    if (errors.length > 0) {
      res.status(400).json({ message: 'CSV parse errors occurred', errors });
      return;
    }

    const newDocs = await Customer.insertMany(validatedCustomers);

    await LoggerService.log(req.user.id, 'CUSTOMER_IMPORT', { count: newDocs.length });

    res.status(201).json({ message: `Successfully imported ${newDocs.length} customers.`, count: newDocs.length });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to import customers', error: error.message });
  }
};
