// rutas Hono
// index.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { transactionSchema } from './schemas';
import { addBlock, getAllBlocks } from './service';

const blockchainRoute = new Hono();

blockchainRoute.get('/transactions', async (c) => {
  const blocks = await getAllBlocks();
  return c.json(blocks);
});

blockchainRoute.post(
  '/transactions',
  zValidator('json', transactionSchema),
  async (c) => {
    const data = c.req.valid('json');
    const newBlock = await addBlock(data);
    return c.json(newBlock);
  }
);

export default blockchainRoute;
