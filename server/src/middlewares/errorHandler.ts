import { Request, Response, NextFunction } from 'express';

/**
 * Global Error Handler Middleware
 * Catches all errors and returns consistent error responses
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Development logging
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Handler] Error caught:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
    });
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors,
    });
    return;
  }

  if (err.name === 'UnauthorizedError') {
    res.status(401).json({
      success: false,
      message: 'Unauthorized access',
    });
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Token expired',
    });
    return;
  }

  if (err.code === 11000) {
    // MongoDB duplicate key error
    res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      field: Object.keys(err.keyPattern || {})[0],
    });
    return;
  }

  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid data format',
    });
    return;
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 Not Found Handler
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors automatically
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;
