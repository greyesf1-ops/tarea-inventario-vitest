import { createServer, type IncomingMessage } from 'node:http';
import { BusinessError, type InventoryService } from './domain.js';
async function body(req: IncomingMessage) {
  let value = '';
  for await (const chunk of req) {
    value += chunk.toString();
    if (Buffer.byteLength(value) > 16384) throw new BusinessError('Cuerpo demasiado grande', 413);
  }
  try { return JSON.parse(value); } catch { throw new BusinessError('JSON inválido'); }
}
export function createApi(service: InventoryService) {
  return createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (req.method === 'GET' && path === '/products') return res.end(JSON.stringify(await service.list()));
      if (req.method === 'POST' && path === '/products') {
        const product = await service.create(await body(req));
        res.statusCode = 201; return res.end(JSON.stringify(product));
      }
      const match = path.match(/^\/products\/(\d+)\/withdrawals$/);
      if (req.method === 'POST' && match) {
        const input = await body(req);
        return res.end(JSON.stringify(await service.withdraw(Number(match[1]), input?.quantity)));
      }
      throw new BusinessError('Ruta no encontrada', 404);
    } catch (error) {
      res.statusCode = error instanceof BusinessError ? error.status : 500;
      res.end(JSON.stringify({error: error instanceof BusinessError ? error.message : 'Error interno'}));
    }
  });
}
