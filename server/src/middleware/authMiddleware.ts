import { Response, NextFunction, Request } from 'express';
import { TokenService } from '../services/tokenService';
import { UserRole } from '../models/User';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    companyId?: string;
  };
  companyId?: string;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authorization token required. Access denied.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = TokenService.verifyAccessToken(token);

    if (!decoded) {
      res.status(401).json({ message: 'Invalid or expired access token.' });
      return;
    }

    // Header override if passed (for company switching / superadmin context)
    const headerCompanyId = req.headers['x-company-id'] as string | undefined;
    const activeCompanyId = decoded.companyId || headerCompanyId;

    // Attach decoded user info to the request
    req.user = {
      id: decoded.id,
      role: decoded.role as UserRole,
      companyId: activeCompanyId,
    };
    req.companyId = activeCompanyId;

    next();
  } catch (error) {
    res.status(500).json({ message: 'Authentication error' });
  }
};
