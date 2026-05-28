import { Router, Request, Response } from 'express';
import { sessionManager } from '../services/sessionManager';
import { messageHistory } from '../services/messageHistory';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const { id, title, metadata } = req.body as {
    id?: string;
    title?: string;
    metadata?: Record<string, unknown>;
  };

  const session = sessionManager.create({ id, title, metadata });
  res.status(201).json(session);
});

router.get('/', (_req: Request, res: Response) => {
  res.json(sessionManager.getAll());
});

router.get('/:id', (req: Request, res: Response) => {
  const session = sessionManager.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: { message: '세션을 찾을 수 없습니다.' } });
    return;
  }
  res.json(session);
});

router.put('/:id', (req: Request, res: Response) => {
  const { title, metadata } = req.body as {
    title?: string;
    metadata?: Record<string, unknown>;
  };

  const session = sessionManager.update(req.params.id, { title, metadata });
  if (!session) {
    res.status(404).json({ error: { message: '세션을 찾을 수 없습니다.' } });
    return;
  }
  res.json(session);
});

router.delete('/:id', (req: Request, res: Response) => {
  const deleted = sessionManager.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: { message: '세션을 찾을 수 없습니다.' } });
    return;
  }
  messageHistory.delete(req.params.id);
  res.status(204).send();
});

router.get('/:id/messages', (req: Request, res: Response) => {
  const session = sessionManager.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: { message: '세션을 찾을 수 없습니다.' } });
    return;
  }
  res.json(messageHistory.get(req.params.id));
});

router.delete('/:id/messages', (req: Request, res: Response) => {
  const session = sessionManager.get(req.params.id);
  if (!session) {
    res.status(404).json({ error: { message: '세션을 찾을 수 없습니다.' } });
    return;
  }
  messageHistory.clear(req.params.id);
  res.status(204).send();
});

export default router;
