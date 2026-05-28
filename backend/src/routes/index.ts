import { Router, Request, Response } from 'express';

const router = Router();

const chatRouter = Router();
const sessionsRouter = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/chat', chatRouter);
router.use('/sessions', sessionsRouter);

export default router;
