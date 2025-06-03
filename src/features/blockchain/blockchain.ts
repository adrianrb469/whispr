const crypto = require("crypto");
export interface Block {
  id: number;
  timestamp: Date;
  sender: string;
  message: string;
  previousHash: string;
  hash: string;
}

let blockchain: Block[] = [];

function createGenesisBlock(): Block {
  const genesis: Block = {
    id: 0,
    timestamp: new Date(),
    sender: "Genesis",
    message: "Genesis Block",
    previousHash: "0",
    hash: "",
  };
  genesis.hash = calculateHash(genesis);
  return genesis;
}

export function initializeBlockchain() {
  if (blockchain.length === 0) {
    blockchain.push(createGenesisBlock());
  }
}

export function calculateHash(block: Omit<Block, "hash">): string {
  const str = `${block.id}${block.timestamp.toISOString()}${block.sender}${block.message}${block.previousHash}`;
  return crypto.createHash("sha256").update(str).digest("hex");
}

export function addBlock(sender: string, message: string): Block {
  const lastBlock = blockchain[blockchain.length - 1];
  const newBlock: Block = {
    id: lastBlock.id + 1,
    timestamp: new Date(),
    sender,
    message,
    previousHash: lastBlock.hash,
    hash: "",
  };
  newBlock.hash = calculateHash(newBlock);
  blockchain.push(newBlock);
  return newBlock;
}

export function getBlockchain(): Block[] {
  return blockchain;
}
