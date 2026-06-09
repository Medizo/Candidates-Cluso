import mongoose, { Connection } from "mongoose";

/**
 * Secondary MongoDB connection to the ClusoWebsite database.
 * Used exclusively for reading CandidateRequest records (job applications
 * submitted via cluso.in) so we can show them on the candidate dashboard.
 *
 * This is a completely separate connection from the primary MONGODB_URI
 * used by the ClusoCRM candidates portal.
 */

let cachedConnection: Connection | null = null;

export async function connectWebsiteDb(): Promise<Connection> {
  if (cachedConnection?.readyState === 1) {
    return cachedConnection;
  }

  const uri = process.env.WEBSITE_MONGODB_URI;
  if (!uri) {
    throw new Error(
      "WEBSITE_MONGODB_URI environment variable is not set. " +
        "This is required to fetch job applications from the ClusoWebsite database."
    );
  }

  const connection = mongoose.createConnection(uri, {
    bufferCommands: false,
    maxPoolSize: 3, // Small pool — this is read-only, low volume
  });

  await connection.asPromise();
  cachedConnection = connection;
  return connection;
}
