import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "wizeazy";

declare global {
  // eslint-disable-next-line no-var
  var _wizeazyMongoClientPromise: Promise<MongoClient> | undefined;
}

/** Whether a MongoDB connection string has been configured. */
export function isDbConfigured(): boolean {
  return Boolean(uri);
}

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  const client = new MongoClient(uri);

  if (process.env.NODE_ENV === "development") {
    // Reuse the connection across Next.js dev server hot-reloads.
    if (!global._wizeazyMongoClientPromise) {
      global._wizeazyMongoClientPromise = client.connect();
    }
    return global._wizeazyMongoClientPromise;
  }

  return client.connect();
}

let clientPromise: Promise<MongoClient> | null = null;

/** Returns the shared MongoDB database handle, connecting on first use. */
export async function getDb(): Promise<Db> {
  if (!clientPromise) clientPromise = getClientPromise();
  const client = await clientPromise;
  return client.db(dbName);
}
