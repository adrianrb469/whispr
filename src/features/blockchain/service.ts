import { addBlock, getBlockchain } from "./blockchain";

export function addTransaction(sender: string, message: string) {
  return addBlock(sender, message);
}

export function getAllTransactions() {
  return getBlockchain();
}
