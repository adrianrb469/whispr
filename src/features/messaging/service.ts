import  db  from "@/db/drizzle";
import { blockchain } from "@/db/schema"; // <-- importa tu tabla
import { eq } from "drizzle-orm";
import { sha256 } from "crypto-hash"; // o tu función hash personalizada

export const createTransaction = async (data: {
  sender: string;
  message: string;
  timestamp: string;
}) => {
  try {
    // Obtener último bloque (última transacción)
    const lastBlock = await db.select().from(blockchain).orderBy(blockchain.id).limit(1);

    // Generar el nuevo ID
    const newId = lastBlock.length > 0 ? lastBlock[0].id + 1 : 1;

    const previousHash = lastBlock.length > 0 ? lastBlock[0].hash : "0";

    const newBlockData = {
      id: newId, // Agregar el ID
      timestamp: new Date(data.timestamp),
      sender: data.sender,
      message: data.message,
      previousHash,
    };

    // Crear el hash actual
    const contentToHash = `${newBlockData.timestamp}${newBlockData.sender}${newBlockData.message}${previousHash}`;
    const hash = await sha256(contentToHash);

    // Insertar en la tabla
    await db.insert(blockchain).values({
      ...newBlockData,
      hash,
    });

    return { success: true };
  } catch (error) {
    console.error("Error en createTransaction:", error);
    return { success: false, error: "Internal Server Error" };
  }
};