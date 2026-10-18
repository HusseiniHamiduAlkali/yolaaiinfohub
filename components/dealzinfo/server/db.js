import mongoose from "mongoose";

export async function connectDb(uri = process.env.MONGO_URI) {
  if (!uri) throw new Error("MONGO_URI is not set. Configure it in the main app's .env file.");
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
