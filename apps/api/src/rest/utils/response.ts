import { Response } from 'express';

/**
 * Helper function to send a successful JSON response
 * Formats responses as { success: true, data: ... }
 */
export function sendSuccessResponse(res: Response, data: object, statusCode: number = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
  });
}
