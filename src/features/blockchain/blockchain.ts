import { createHash } from "crypto";
import db from "@/db/drizzle";
import { blockchain } from "drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// Aqui definimos la estructura del bloque de la blockchain
export interface Block {
  id: number;
  conversationId: number | null;
  timestamp: Date;
  sender: string;
  message: string;
  previousHash: string;
  hash: string;
}

// Nueva interfaz para los datos del bloque que se van a agregar
// Esta interfaz no incluye el hash, ya que se calculará después de insertar el bloque
export interface NewBlock {
  conversationId: number;
  sender: string;
  message: string;
}

// Función para calcular el hash de un bloque usabdo SHA-256
export function calculateHash(block: Omit<Block, "hash">): string {
  const str = `${block.id}${block.timestamp.toISOString()}${block.sender}${
    block.message
  }${block.previousHash}${block.conversationId}`;
  return createHash("sha256").update(str).digest("hex");
}

// Función para obtener el último bloque de una conversación específica
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

// Función para crear el bloque génesis de una conversación
// Este bloque es el primer bloque de la blockchain y no tiene un bloque anterior
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

  // Insertar en la base de datos para obtener el ID real
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

  // crear el bloque completo con el ID real de la base de datos
  const completeBlock: Block = {
    ...insertedBlock,
    timestamp: new Date(insertedBlock.timestamp),
  };

  // calcular el hash con el ID real de la base de datos
  // Esto es necesario porque el ID se usa en el cálculo del hash
  const calculatedHash = calculateHash(completeBlock);

  // actualizar el hash en la base de datos
  // Esto asegura que el bloque génesis tenga un hash correcto
  await db
    .update(blockchain)
    .set({ hash: calculatedHash })
    .where(eq(blockchain.id, insertedBlock.id));

  // retornamos el bloque completo con el hash correcto
  // Esto asegura que el bloque génesis tenga un hash correcto
  return {
    ...completeBlock,
    hash: calculatedHash,
  };
}

// Función para agregar un nuevo bloque a la blockchain
// Esta función toma los datos del nuevo bloque, obtiene el último bloque de la conversación,
export async function addBlock(newBlockData: NewBlock): Promise<Block> {
  const { conversationId, sender, message } = newBlockData;

  // Obtener el último bloque de la conversación
  // Si no hay bloques, se creará el bloque génesis
  let lastBlock = await getLastBlock(conversationId);

  // Si no hay un último bloque, creamos el bloque génesis
  // El bloque génesis es el primer bloque de la blockchain y no tiene un bloque anterior
  if (!lastBlock) {
    lastBlock = await createGenesisBlock(conversationId);
  }

  // Creamos un nuevo bloque sin el hash
  // Este bloque contendrá los datos del nuevo mensaje y el hash del bloque anterior
  const newBlockWithoutHash = {
    conversationId,
    timestamp: new Date(),
    sender,
    message,
    previousHash: lastBlock.hash,
  };

  // Insertar el nuevo bloque en la base de datos
  // Esto nos dará el ID real del bloque insertado
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

  // Creamos el bloque completo con el ID real de la base de datos
  // Esto es necesario porque el ID se usa en el cálculo del hash
  const completeBlock: Block = {
    ...insertedBlock,
    timestamp: new Date(insertedBlock.timestamp),
  };

  // Calculamos el hash del bloque completo
  // Esto asegura que el hash sea correcto y único para este bloque
  const calculatedHash = calculateHash(completeBlock);

  // Actualizamos el hash en la base de datos
  // Esto asegura que el bloque tenga un hash correcto
  await db
    .update(blockchain)
    .set({ hash: calculatedHash })
    .where(eq(blockchain.id, insertedBlock.id));

  // retornamos el bloque completo con el hash correcto
  // Esto asegura que el bloque tenga un hash correcto
  return {
    ...completeBlock,
    hash: calculatedHash,
  };
}

// Función para obtener la blockchain de una conversación específica o de todas las conversaciones
// Si se proporciona un conversationId, se obtendrán solo los bloques de esa conversación
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

// Función para validar la blockchain de una conversación específica
// Esta función verifica que todos los bloques estén correctamente encadenados y que los hashes sean válidos
export async function validateBlockchain(
  conversationId: number
): Promise<boolean> {
  const chain = await getBlockchain(conversationId);

  if (chain.length === 0) {
    return true;
  }

  for (let i = 1; i < chain.length; i++) {
    const currentBlock = chain[i];
    const previousBlock = chain[i - 1];

    // verifico que el ID del bloque actual sea mayor que el del bloque anterior
    if (currentBlock.previousHash !== previousBlock.hash) {
      return false;
    }

    // recalculo el hash del bloque actual usando la función calculateHash
    const recalculatedHash = calculateHash(currentBlock);
    if (currentBlock.hash !== recalculatedHash) {
      return false;
    }
  }
  // Si todos los bloques son válidos, retornamos true
  // Esto indica que la blockchain de la conversación es válida
  return true;
}
