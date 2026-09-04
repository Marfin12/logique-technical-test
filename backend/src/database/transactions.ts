import type { ClientSession, MongoClient } from "mongodb";

export async function runInTransaction<T>(
  client: MongoClient,
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = client.startSession();
  try {
    return await session.withTransaction(() => operation(session));
  } finally {
    await session.endSession();
  }
}
