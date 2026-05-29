import { Router, Request, Response } from 'express';
import { VllmService } from '../services/vllm';
import { messageHistory } from '../services/messageHistory';
import { Message } from '../types';
import { DEFAULT_SYSTEM_PROMPT } from '../config/systemPrompt';

const router = Router();
const vllmService = new VllmService();

router.post('/', async (req: Request, res: Response) => {
  const { sessionId, message } = req.body as { sessionId?: string; message?: string };

  if (!sessionId) {
    res.status(400).json({ error: { message: '세션 ID가 필요합니다.' } });
    return;
  }
  if (!message) {
    res.status(400).json({ error: { message: '메시지를 입력해주세요.' } });
    return;
  }

  const userMessage: Message = {
    role: 'user',
    content: [{ text: message }],
  };
  messageHistory.add(sessionId, userMessage);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const messages = messageHistory.get(sessionId);
    const stream = vllmService.chatStream({
      messages,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
    });

    let assistantText = '';

    for await (const event of stream) {
      switch (event.type) {
        case 'text_delta':
          assistantText += event.text ?? '';
          sendEvent('text', { text: event.text });
          break;
        case 'tool_use_start':
          sendEvent('tool_start', { toolName: event.toolName, toolUseId: event.toolUseId });
          break;
        case 'tool_result':
          sendEvent('tool_result', { toolResult: event.toolResult });
          break;
        case 'message_complete':
          if (assistantText) {
            messageHistory.add(sessionId, {
              role: 'assistant',
              content: [{ text: assistantText }],
            });
          }
          sendEvent('done', { usage: event.usage });
          break;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
    sendEvent('error', { message: errorMessage });
  }

  res.end();
});

export default router;
