import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.status ?? err.statusCode ?? 500;

  console.error(`[ERROR] ${req.method} ${req.url}`, err);

  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal server error',
      code: err.code,
    },
  });
}
