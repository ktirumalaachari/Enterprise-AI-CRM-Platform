/**
 * Standardized API Response Utilities
 * Every endpoint returns {success, message, data} or {success, message, errors}
 */
import { Response } from 'express';

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]> | string[];
}

/**
 * Send a standardized success response
 */
export const sendSuccess = <T = unknown>(
  res: Response,
  data: T,
  message = 'Request successful',
  statusCode = 200
): void => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  } satisfies ApiSuccessResponse<T>);
};

/**
 * Send a standardized error response
 */
export const sendError = (
  res: Response,
  message: string,
  statusCode = 400,
  errors?: Record<string, string[]> | string[]
): void => {
  const body: ApiErrorResponse = { success: false, message };
  if (errors) body.errors = errors;
  res.status(statusCode).json(body);
};
