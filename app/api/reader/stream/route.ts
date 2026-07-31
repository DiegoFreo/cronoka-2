// app/api/reader/stream/route.ts
import { NextResponse } from 'next/server';
import { zebraManager, TagData } from '@/app/lib/zebraReader';

// Força o Next.js a tratar a rota como dinâmica e sem cache
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// app/api/reader/stream/route.ts (Exemplo de tratamento de desconexão no SSE)

export async function GET(req: Request) {
  
  const stream = new ReadableStream({
    start(controller) {
      const handleTag = (tag: any) => {
        controller.enqueue(`data: ${JSON.stringify(tag)}\n\n`);
      };

      // Adiciona o ouvinte
      zebraManager.on('tag', handleTag);

      // Tratamento quando a conexão HTTP/SSE é cortada
      req.signal.addEventListener('abort', () => {
        console.log('[SSE] Cliente desconectou da rota /api/reader/stream. Limpando ouvintes...');
        
        // 1. Remove o ouvinte IMEDIATAMENTE do EventEmitter para liberar memória
        zebraManager.off('tag', handleTag);

        // 2. Dispara o stopReading de forma ASSÍNCRONA sem aguardar (evita derrubar a rota)
        zebraManager.stopReading().catch((err) => {
          console.error('[SSE] Erro ao parar leitor de forma assíncrona:', err);
        });
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}