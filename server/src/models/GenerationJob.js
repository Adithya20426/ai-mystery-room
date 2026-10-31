import mongoose from 'mongoose';

const generationJobSchema = new mongoose.Schema({
  investigationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Investigation', required: true, index: true },
  status: { type: String, default: 'generating' }, currentStage: String,
  stages: [{ name: String, status: String, error: String, startedAt: Date, completedAt: Date }], error: String
}, { timestamps: true });

export default mongoose.model('GenerationJob', generationJobSchema);
