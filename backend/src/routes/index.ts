import { Router, Request, Response } from 'express';
import chatRouter from './chat';
import sessionsRouter from './sessions';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/chat', chatRouter);
router.use('/sessions', sessionsRouter);

export default router;
