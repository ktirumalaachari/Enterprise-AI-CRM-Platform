import { Router } from 'express';
import { getEvents, createEvent, deleteEvent } from '../controllers/calendarController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getEvents);
router.post('/', createEvent);
router.delete('/:id', deleteEvent);

export default router;
