import { Result, ok, err } from "@/utils/result";
import { AuthError } from "@/utils/errors";
import { conversations, messages, users } from "drizzle/schema";
import db from "@/db/drizzle";
import { eq } from "drizzle-orm";

async function addMessage(message) {
    await db.insert(messages).values(message);
}

async function getMessages() {

}
