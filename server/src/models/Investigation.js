import mongoose from 'mongoose';

const investigationSchema = new mongoose.Schema({
  caseNumber: { type: String, unique: true }, sessionId: { type: String, required: true, index: true },
  title: { type: String, required: true }, scenario: { type: String, required: true }, description: String,
  category: String, difficulty: String, status: { type: String, default: 'generating', index: true },
  suspects: [mongoose.Schema.Types.Mixed], evidence: [mongoose.Schema.Types.Mixed], timeline: [mongoose.Schema.Types.Mixed],
  solution: { type: mongoose.Schema.Types.Mixed, select: false },
  notes: [{ noteId: String, content: String, createdAt: Date, updatedAt: Date }],
  generation: { currentStage: String, stages: [mongoose.Schema.Types.Mixed], error: String, model: String, attempts: Number },
  verdict: { submitted: Boolean, isCorrect: Boolean, suspectId: String, submittedAt: Date }
}, { timestamps: true, minimize: false });

export default mongoose.model('Investigation', investigationSchema);
