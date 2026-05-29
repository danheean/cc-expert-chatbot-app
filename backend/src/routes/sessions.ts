import { Router, Request, Response } from 'express';
import { sessionManager } from '../services/sessionManager';
import { messageHistory } from '../services/messageHistory';

const router = Router();

function getSessionId(req: Request): string | undefined {
  const { id } = req.params;
  return typeof id === 'string' ? id : undefined;
}

router.post('/', (req: Request, res: Response) => {
  const { id, title, metadata } = req.body as {
    id?: string;
    title?: string;
    metadata?: Record<string, unknown>;
  };

  const session = sessionManager.create({
    ...(id !== undefined && { id }),
    ...(title !== undefined && { title }),
    ...(metadata !== undefined && { metadata }),
  });
  res.status(201).json(session);
});

router.get('/', (_req: Request, res: Response) => {
  res.json(sessionManager.getAll());
});

router.get('/:id', (req: Request, res: Response) => {
  const id = getSessionId(req);
  if (!id) {
    res.status(400).json({ error: { message: '세션 ID가 필요합니다.' } });
    return;
  }
  const session = sessionManager.get(id);
  if (!session) {
    res.status(404).json({ error: { message: '세션을 찾을 수 없습니다.' } });
    return;
  }
  res.json(session);
});

router.put('/:id', (req: Request, res: Response) => {
  const id = getSessionId(req);
  if (!id) {
    res.status(400).json({ error: { message: '세션 ID가 필요합니다.' } });
    return;
  }
  const { title, metadata } = req.body as {
    title?: string;
    metadata?: Record<string, unknown>;
  };

  const session = sessionManager.update(id, {
    ...(title !== undefined && { title }),
    ...(metadata !== undefined && { metadata }),
  });
  if (!session) {
    res.status(404).json({ error: { message: '세션을 찾을 수 없습니다.' } });
    return;
  }
  res.json(session);
});

router.delete('/:id', (req: Request, res: Response) => {
  const id = getSessionId(req);
  if (!id) {
    res.status(400).json({ error: { message: '세션 ID가 필요합니다.' } });
    return;
  }
  const deleted = sessionManager.delete(id);
  if (!deleted) {
    res.status(404).json({ error: { message: '세션을 찾을 수 없습니다.' } });
    return;
  }
  messageHistory.delete(id);
  res.status(204).send();
});

router.get('/:id/messages', (req: Request, res: Response) => {
  const id = getSessionId(req);
  if (!id) {
    res.status(400).json({ error: { message: '세션 ID가 필요합니다.' } });
    return;
  }
  const session = sessionManager.get(id);
  if (!session) {
    res.status(404).json({ error: { message: '세션을 찾을 수 없습니다.' } });
    return;
  }
  res.json(messageHistory.get(id));
});

router.delete('/:id/messages', (req: Request, res: Response) => {
  const id = getSessionId(req);
  if (!id) {
    res.status(400).json({ error: { message: '세션 ID가 필요합니다.' } });
    return;
  }
  const session = sessionManager.get(id);
  if (!session) {
    res.status(404).json({ error: { message: '세션을 찾을 수 없습니다.' } });
    return;
  }
  messageHistory.clear(id);
  res.status(204).send();
});

export default router;
