import { createHash } from "crypto";
import db from "@/db/drizzle";
import { blockchain } from "drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export interface Block {
  id: number;
  conversationId: number | null;
  timestamp: Date;
  sender: string;
  message: string;
  previousHash: string;
  hash: string;
}

export interface NewBlock {
  conversationId: number;
  sender: string;
  message: string;
}

export function calculateHash(block: Omit<Block, "hash">): string {
  const str = `${block.id}${block.timestamp.toISOString()}${block.sender}${
    block.message
  }${block.previousHash}${block.conversationId}`;
  return createHash("sha256").update(str).digest("hex");
}

export async function getLastBlock(
  conversationId: number
): Promise<Block | null> {
  const result = await db
    .select()
    .from(blockchain)
    .where(eq(blockchain.conversationId, conversationId))
    .orderBy(desc(blockchain.id))
    .limit(1);

  return result[0] || null;
}

export async function createGenesisBlock(
  conversationId: number
): Promise<Block> {
  const genesis = {
    id: 0, // This will be overwritten by the database
    conversationId,
    timestamp: new Date(),
    sender: "System",
    message: "Genesis Block",
    previousHash: "0",
    hash: "",
  };

  // Calculate hash before inserting
  const hashInput = `0${genesis.timestamp.toISOString()}${genesis.sender}${
    genesis.message
  }0${conversationId}`;
  genesis.hash = createHash("sha256").update(hashInput).digest("hex");

  const [insertedBlock] = await db
    .insert(blockchain)
    .values({
      conversationId: genesis.conversationId,
      timestamp: genesis.timestamp,
      sender: genesis.sender,
      message: genesis.message,
      previousHash: genesis.previousHash,
      hash: genesis.hash,
    })
    .returning();

  return {
    ...insertedBlock,
    timestamp: new Date(insertedBlock.timestamp),
  };
}

export async function addBlock(newBlockData: NewBlock): Promise<Block> {
  const { conversationId, sender, message } = newBlockData;

  // Get the last block for this conversation
  let lastBlock = await getLastBlock(conversationId);

  // If no blocks exist for this conversation, create genesis block
  if (!lastBlock) {
    lastBlock = await createGenesisBlock(conversationId);
  }

  // Create new block
  const newBlock = {
    id: 0, // Will be set by database
    conversationId,
    timestamp: new Date(),
    sender,
    message,
    previousHash: lastBlock.hash,
    hash: "",
  };

  // Calculate hash
  newBlock.hash = calculateHash(newBlock);

  // Insert into database
  const [insertedBlock] = await db
    .insert(blockchain)
    .values({
      conversationId: newBlock.conversationId,
      timestamp: newBlock.timestamp,
      sender: newBlock.sender,
      message: newBlock.message,
      previousHash: newBlock.previousHash,
      hash: newBlock.hash,
    })
    .returning();

  return {
    ...insertedBlock,
    timestamp: new Date(insertedBlock.timestamp),
  };
}

export async function getBlockchain(conversationId?: number): Promise<Block[]> {
  const query = conversationId
    ? db
        .select()
        .from(blockchain)
        .where(eq(blockchain.conversationId, conversationId))
    : db.select().from(blockchain);

  const result = await query.orderBy(blockchain.id);

  return result.map((block) => ({
    ...block,
    timestamp: new Date(block.timestamp),
  }));
}

export async function validateBlockchain(
  conversationId: number
): Promise<boolean> {
  const chain = await getBlockchain(conversationId);

  if (chain.length === 0) return true;

  for (let i = 1; i < chain.length; i++) {
    const currentBlock = chain[i];
    const previousBlock = chain[i - 1];

    // Check if current block's previousHash matches previous block's hash
    if (currentBlock.previousHash !== previousBlock.hash) {
      return false;
    }

    // Recalculate and verify current block's hash
    const recalculatedHash = calculateHash(currentBlock);
    if (currentBlock.hash !== recalculatedHash) {
      return false;
    }
  }

  return true;
}
