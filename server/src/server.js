import mongoose from 'mongoose';
import { setServers } from 'node:dns';
import app from './app.js';
import { env } from './config/env.js';

if (env.dnsServers.length) setServers(env.dnsServers);
if (!env.mongoUri) { console.error('MONGODB_URI is required. Copy server/.env.example to server/.env and configure the database.'); process.exit(1); }
if (!env.sessionSecret || env.sessionSecret.length < 32 || env.sessionSecret === 'replace-with-a-long-random-secret') {
  console.error('SESSION_SECRET must be set to a private value of at least 32 characters.');
  process.exit(1);
}
if (env.nodeEnv === 'production' && env.clientUrl === 'http://localhost:5173') {
  console.error('CLIENT_URL must be set to the deployed frontend origin in production.');
  process.exit(1);
}
try {
  await mongoose.connect(env.mongoUri);
  app.listen(env.port,()=>console.log(`AI Mystery Room API listening on http://localhost:${env.port}`));
} catch(error) { console.error('Unable to connect to MongoDB:',error.message); process.exit(1); }
