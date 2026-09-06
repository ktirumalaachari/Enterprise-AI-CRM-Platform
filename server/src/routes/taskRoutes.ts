import { Router } from 'express';
import { getTasks, createTask, updateTask, toggleTaskStatus, deleteTask } from '../controllers/taskController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getTasks);
router.post('/', createTask);
router.put('/:id', updateTask);
router.patch('/:id/status', toggleTaskStatus);
router.delete('/:id', deleteTask);

export default router;
