import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({ sessionId: { type: String, unique: true }, createdAt: { type: Date, default: Date.now } });
export default mongoose.model('InvestigationSession', sessionSchema);
