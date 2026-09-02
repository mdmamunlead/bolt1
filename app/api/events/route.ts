import { NextRequest } from 'next/server';
import { eventBus } from '@/lib/server/event-bus';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      // Send current queue state
      const logHandler = (log: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', log })}\n\n`));
        } catch {}
      };

      const progressHandler = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'progress', ...data })}\n\n`));
        } catch {}
      };

      const statusHandler = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', ...data })}\n\n`));
        } catch {}
      };

      const queueHandler = (queue: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'queue', queue })}\n\n`));
        } catch {}
      };

      eventBus.on('log', logHandler);
      eventBus.on('progress', progressHandler);
      eventBus.on('status', statusHandler);
      eventBus.on('queue', queueHandler);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        eventBus.off('log', logHandler);
        eventBus.off('progress', progressHandler);
        eventBus.off('status', statusHandler);
        eventBus.off('queue', queueHandler);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
