import { Router } from 'express';
import { 
  createTeam, 
  getMyTeams,
  addMemberToTeam
} from '../controllers/teamController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// All team routes require authentication
router.use(authenticate);

router.post('/', createTeam);
router.get('/', getMyTeams);
router.post('/:teamId/invite', addMemberToTeam);
router.post('/:teamId/add-member', addMemberToTeam);

export default router;
