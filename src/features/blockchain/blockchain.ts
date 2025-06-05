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
  const genesisWithoutHash = {
    conversationId,
    timestamp: new Date(),
    sender: "System",
    message: "Genesis Block",
    previousHash: "0",
  };

  // Insert into database to get the actual ID
  const [insertedBlock] = await db
    .insert(blockchain)
    .values({
      conversationId: genesisWithoutHash.conversationId,
      timestamp: genesisWithoutHash.timestamp,
      sender: genesisWithoutHash.sender,
      message: genesisWithoutHash.message,
      previousHash: genesisWithoutHash.previousHash,
      hash: "", // Temporary empty hash
    })
    .returning();

  // Create the complete block with the real database ID
  const completeBlock: Block = {
    ...insertedBlock,
    timestamp: new Date(insertedBlock.timestamp),
  };

  // Calculate hash with the actual database ID
  const calculatedHash = calculateHash(completeBlock);

  // Update the hash in the database
  await db
    .update(blockchain)
    .set({ hash: calculatedHash })
    .where(eq(blockchain.id, insertedBlock.id));

  // Return the complete block with the correct hash
  return {
    ...completeBlock,
    hash: calculatedHash,
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

  // Create new block without hash first
  const newBlockWithoutHash = {
    conversationId,
    timestamp: new Date(),
    sender,
    message,
    previousHash: lastBlock.hash,
  };

  // Insert into database to get the actual ID
  const [insertedBlock] = await db
    .insert(blockchain)
    .values({
      conversationId: newBlockWithoutHash.conversationId,
      timestamp: newBlockWithoutHash.timestamp,
      sender: newBlockWithoutHash.sender,
      message: newBlockWithoutHash.message,
      previousHash: newBlockWithoutHash.previousHash,
      hash: "", // Temporary empty hash
    })
    .returning();

  // Now create the complete block with the real database ID
  const completeBlock: Block = {
    ...insertedBlock,
    timestamp: new Date(insertedBlock.timestamp),
  };

  // Calculate hash with the actual database ID
  const calculatedHash = calculateHash(completeBlock);

  // Update the hash in the database
  await db
    .update(blockchain)
    .set({ hash: calculatedHash })
    .where(eq(blockchain.id, insertedBlock.id));

  // Return the complete block with the correct hash
  return {
    ...completeBlock,
    hash: calculatedHash,
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

  if (chain.length === 0) {
    console.log(
      `[validateBlockchain] Chain is empty for conversation ${conversationId}. Considered valid.`
    );
    return true;
  }

  for (let i = 1; i < chain.length; i++) {
    const currentBlock = chain[i];
    const previousBlock = chain[i - 1];

    // Check if current block's previousHash matches previous block's hash
    if (currentBlock.previousHash !== previousBlock.hash) {
      console.error(
        `[validateBlockchain] Invalid previousHash at index ${i}:`,
        `currentBlock.previousHash=${currentBlock.previousHash}, previousBlock.hash=${previousBlock.hash}`,
        `Block ID: ${currentBlock.id}, Previous Block ID: ${previousBlock.id}`
      );
      return false;
    }

    // Recalculate and verify current block's hash
    console.log(
      "[validateBlockchain] Block data for recalculation:",
      JSON.stringify(currentBlock, null, 2)
    );
    console.log(
      "[validateBlockchain] String used for hash:",
      `${currentBlock.id}${currentBlock.timestamp.toISOString()}${
        currentBlock.sender
      }${currentBlock.message}${currentBlock.previousHash}${
        currentBlock.conversationId
      }`
    );
    const recalculatedHash = calculateHash(currentBlock);
    if (currentBlock.hash !== recalculatedHash) {
      console.error(
        `[validateBlockchain] Invalid hash at index ${i}:`,
        `currentBlock.hash=${currentBlock.hash}, recalculatedHash=${recalculatedHash}`,
        `Block ID: ${currentBlock.id}`
      );
      return false;
    }
  }

  console.log(
    `[validateBlockchain] Chain is valid for conversation ${conversationId}.`
  );
  return true;
}
