// blockchain.ts
import { createHash } from 'crypto';

export interface BlockData {
  sender: string; // esta varible es para el nombre del usuario
  message: string; // esta es para la parte del mensaje
  timestamp: string; // esta es la parte de la fecha
}

export class Block {
  id: number;
  timestamp: string;
  sender: string;
  message: string;
  previousHash: string;
  hash: string;

  constructor(id: number, data: BlockData, previousHash: string) {
    this.id = id;
    this.timestamp = data.timestamp;
    this.sender = data.sender;
    this.message = data.message;
    this.previousHash = previousHash;
    this.hash = this.calculateHash();
  }

  calculateHash(): string {
    const data = this.id + this.timestamp + this.sender + this.message + this.previousHash;
    return createHash('sha256').update(data).digest('hex');
  }
}
