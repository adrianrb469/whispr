import {
  addBlock,
  getBlockchain,
  validateBlockchain,
  type NewBlock,
} from "./blockchain";

// funcion para agregar una transacción a la blockchain
// Esta función toma el ID de la conversación, el remitente y el mensaje,
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

// funcion para obtener todas las transacciones de una conversación
// Si no se proporciona un ID de conversación, se obtienen todas las transacciones
export async function getAllTransactions(conversationId?: number) {
  return getBlockchain(conversationId);
}

export async function validateConversationBlockchain(conversationId: number) {
  return validateBlockchain(conversationId);
}
