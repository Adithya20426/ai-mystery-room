import mongoose from 'mongoose';
import { setServers } from 'node:dns';
import app from './app.js';
import { env } from './config/env.js';

if (env.dnsServers.length) setServers(env.dnsServers);
if (!env.mongoUri) { console.error('MONGODB_URI is required. Copy server/.env.example to server/.env and configure the database.'); process.exit(1); }
try {
  await mongoose.connect(env.mongoUri);
  app.listen(env.port,()=>console.log(`AI Mystery Room API listening on http://localhost:${env.port}`));
} catch(error) { console.error('Unable to connect to MongoDB:',error.message); process.exit(1); }
