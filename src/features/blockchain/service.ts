// acceso a DB 
import  db  from '@/db/drizzle';
import { blockchain } from '@/db/schema';
import { Block, BlockData } from './blockchain';
import { eq, desc } from 'drizzle-orm';

export const getAllBlocks = async () => {
  return await db.select().from(blockchain).orderBy(blockchain.id);
};

export const getLatestBlock = async () => {
  const [latest] = await db.select().from(blockchain).orderBy(desc(blockchain.id)).limit(1);
  return latest;
};

export const addBlock = async (data: BlockData) => {
  const lastBlock = await getLatestBlock();
  const id = lastBlock ? lastBlock.id + 1 : 0;
  const previousHash = lastBlock ? lastBlock.hash : '0';

  const newBlock = new Block(id, data, previousHash);

  await db.insert(blockchain).values({
    id: newBlock.id,
    timestamp: new Date(newBlock.timestamp),
    sender: newBlock.sender,
    message: newBlock.message,
    previousHash: newBlock.previousHash,
    hash: newBlock.hash,
  });

  return newBlock;
};
