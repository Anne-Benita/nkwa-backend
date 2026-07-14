import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { AppError } from './error.middleware';

export interface AuthenticatedRequest extends Request {
  driver?: {
    id: string;
    email: string;
    workId: string;
  };
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AppError(
        401,
        'UNAUTHORIZED',
        'Authorization header is missing or does not contain a Bearer token.'
      )
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as {
      id: string;
      email: string;
      workId: string;
    };

    req.driver = decoded;
    next();
  } catch (err: any) {
    let message = 'Invalid or expired access token.';
    if (err.name === 'TokenExpiredError') {
      message = 'Access token has expired. Please refresh your session.';
    }
    return next(new AppError(401, 'UNAUTHORIZED', message));
  }
};

export default authMiddleware;
