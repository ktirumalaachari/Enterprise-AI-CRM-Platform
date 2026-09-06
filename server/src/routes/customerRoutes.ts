import { Router } from 'express';
import { 
  createCustomer, 
  getCustomers, 
  updateCustomer, 
  addCustomerNote, 
  deleteCustomer, 
  importCustomers 
} from '../controllers/customerController';
import { authenticate } from '../middleware/authMiddleware';
import { authorize } from '../middleware/rbacMiddleware';

const router = Router();

// All customer routes require authentication
router.use(authenticate);

router.post('/', createCustomer);
router.get('/', getCustomers);
router.put('/:id', updateCustomer);
router.post('/:id/notes', addCustomerNote);
router.post('/import', importCustomers);

// Only SuperAdmin, Admin, and SalesManager roles can delete sales targets
router.delete('/:id', authorize(['SuperAdmin', 'Admin', 'SalesManager']), deleteCustomer);

export default router;
