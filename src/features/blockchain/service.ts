import {
  addBlock,
  getBlockchain,
  validateBlockchain,
  type NewBlock,
} from "./blockchain";

export async function addTransaction(
  conversationId: number,
  sender: string,
  message: string
) {
  const newBlock: NewBlock = {
    conversationId,
    sender,
    message,
  };
  return addBlock(newBlock);
}

export async function getAllTransactions(conversationId?: number) {
  return getBlockchain(conversationId);
}

export async function validateConversationBlockchain(conversationId: number) {
  return validateBlockchain(conversationId);
}
