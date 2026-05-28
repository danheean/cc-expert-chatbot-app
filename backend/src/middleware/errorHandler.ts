import { Request, Response, NextFunction } from 'express';

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: HttpError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.status ?? err.statusCode ?? 500;

  console.error(`[ERROR] ${req.method} ${req.url}`, err);

  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: err.code ?? 'INTERNAL_ERROR',
    },
  });
}
