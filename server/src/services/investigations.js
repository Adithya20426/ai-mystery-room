import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Investigation from '../models/Investigation.js';
import GenerationJob from '../models/GenerationJob.js';
import { env } from '../config/env.js';
import { generateCase } from '../ai/generateCase.js';

const stages = ['analysing_scenario','creating_suspects','building_investigation','generating_evidence','validating_mystery','preparing_room'];
const publicInvestigation = (doc) => ({ id: doc._id.toString(), caseNumber: doc.caseNumber, title: doc.title, description: doc.description, category: doc.category, difficulty: doc.difficulty, status: doc.status, createdAt: doc.createdAt, suspectCount: doc.suspects?.length || 0, evidenceCount: doc.evidence?.length || 0, notes: doc.notes || [], verdictSubmitted: Boolean(doc.verdict?.submitted) });
function authorized(id, sessionId) { return Investigation.findOne({ _id: id, sessionId }).select('+solution'); }
export async function createInvestigation(input, sessionId) {
  const inv = await Investigation.create({ sessionId, caseNumber: `CF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`, title: input.title?.trim() || 'Untitled investigation', scenario: input.scenario.trim(), description: 'Your case is being assembled from the premise you supplied.', category: input.category, difficulty: input.difficulty, status: 'generating', generation: { currentStage: stages[0], stages: stages.map(name => ({ name, status:'pending' })), attempts:0 } });
  const job = await GenerationJob.create({ investigationId: inv._id, status: 'generating', currentStage: stages[0], stages: stages.map(name=>({name,status:'pending'})) });
  runGeneration(inv._id.toString(), input, job._id.toString()).catch(error => console.error('Generation job failed:', error.message));
  return { investigationId: inv._id.toString(), generationJobId: job._id.toString(), status: 'generating' };
}
async function setGenerationStage(id, jobId, stage, status='generating') {
  const currentIndex=stages.indexOf(stage);
  const stageRows=stages.map((name,index)=>({name,status:index<currentIndex?'complete':index===currentIndex?'running':'pending',...(index<currentIndex?{completedAt:new Date()}:index===currentIndex?{startedAt:new Date()}: {})}));
  await Promise.all([
    Investigation.findByIdAndUpdate(id,{status,'generation.currentStage':stage,'generation.stages':stageRows}),
    GenerationJob.findByIdAndUpdate(jobId,{status,currentStage:stage,stages:stageRows})
  ]);
}
async function runGeneration(id, input, jobId) {
  try {
    const result = await generateCase(input,(stage)=>setGenerationStage(id,jobId,stage));
    await setGenerationStage(id,jobId,'validating_mystery','validating');
    const data = result.data;
    const suspects = data.suspects.map(s => ({...s, imageUrl: ''}));
    const inv = await Investigation.findById(id).select('+solution');
    inv.title = data.title; inv.description = data.description; inv.suspects = suspects; inv.evidence = data.evidence; inv.timeline = data.timeline;
    inv.solution = { ...data.solution, decisiveEvidenceIds: data.solution.decisiveEvidenceIds }; inv.status = 'ready';
    inv.generation = { currentStage: 'ready', stages: stages.map(name=>({name,status:'complete',completedAt:new Date()})), model: env.geminiModel, attempts: result.attempts };
    await inv.save();
    await GenerationJob.findByIdAndUpdate(jobId,{status:'ready',currentStage:'ready',stages:stages.map(name=>({name,status:'complete',completedAt:new Date()}))});
  } catch(error) {
    console.error(`Case generation failed (${id}):`,error.message);
    await Investigation.findByIdAndUpdate(id,{status:'failed','generation.currentStage':'failed','generation.error':error.message});
    await GenerationJob.findByIdAndUpdate(jobId,{status:'failed',currentStage:'failed',error:error.message});
  }
}
export async function getStatus(id, sessionId) { const inv=await Investigation.findOne({_id:id,sessionId}); if(!inv) return null; const job=await GenerationJob.findOne({investigationId:inv._id}).lean(); return {investigationId:id,status:inv.status,currentStage:job?.currentStage||inv.generation?.currentStage,stages:job?.stages||[],error:inv.status==='failed'?'The case could not be generated. Check the server configuration and try again.':undefined}; }
export async function getInvestigation(id, sessionId) { const inv=await Investigation.findOne({_id:id,sessionId}); return inv?publicInvestigation(inv):null; }
export async function listSuspects(id,sessionId){const inv=await Investigation.findOne({_id:id,sessionId});return inv?.status==='ready'?inv.suspects:inv?[]:null;}
export async function listEvidence(id,sessionId){const inv=await Investigation.findOne({_id:id,sessionId});return inv?.status==='ready'?inv.evidence.map(({internalClassification,internalExplanation,...item})=>item):inv?[]:null;}
export async function getEvidence(id,evidenceId,sessionId){const inv=await Investigation.findOne({_id:id,sessionId});if(!inv)return null;const item=inv.evidence.find(e=>e.evidenceId===evidenceId);if(!item)return false;const {internalClassification,internalExplanation,...publicItem}=item;return publicItem;}
export async function getTimeline(id,sessionId){const inv=await Investigation.findOne({_id:id,sessionId});return inv?.status==='ready'?inv.timeline:inv?[]:null;}
export async function addNote(id,sessionId,content){const inv=await Investigation.findOne({_id:id,sessionId});if(!inv)return null;inv.notes.push({noteId:crypto.randomUUID(),content:content.trim(),createdAt:new Date(),updatedAt:new Date()});await inv.save();return inv.notes;}
export async function updateNote(id,sessionId,noteId,content){const inv=await Investigation.findOne({_id:id,sessionId});if(!inv)return null;const note=inv.notes.find(n=>n.noteId===noteId);if(!note)return false;note.content=content.trim();note.updatedAt=new Date();await inv.save();return inv.notes;}
export async function deleteNote(id,sessionId,noteId){const inv=await Investigation.findOne({_id:id,sessionId});if(!inv)return null;inv.notes=inv.notes.filter(n=>n.noteId!==noteId);await inv.save();return inv.notes;}
export async function submitVerdict(id,sessionId,suspectId){const inv=await authorized(id,sessionId);if(!inv)return null;if(inv.status!=='ready')return {pending:true};if(inv.verdict?.submitted)return buildResult(inv,suspectId);if(!inv.suspects.some(s=>s.suspectId===suspectId))return false;inv.verdict={submitted:true,suspectId,isCorrect:suspectId===inv.solution.culpritId,submittedAt:new Date()};await inv.save();return buildResult(inv,suspectId);}
function buildResult(inv,requestedId){const selectedId=inv.verdict?.suspectId||requestedId;const culprit=inv.suspects.find(s=>s.suspectId===inv.solution.culpritId);const keyClues=(inv.solution.decisiveEvidenceIds||[]).map(id=>inv.evidence.find(item=>item.evidenceId===id)).filter(Boolean).map(({evidenceId,title,type,description,location,clueImportance})=>({evidenceId,title,type,description,location,clueImportance}));return {isCorrect:inv.verdict.isCorrect,selectedSuspect:inv.suspects.find(s=>s.suspectId===selectedId),culprit,solution:{motive:inv.solution.motive,method:inv.solution.method,opportunity:inv.solution.opportunity,explanation:inv.solution.explanation,decisiveEvidence:inv.solution.decisiveEvidence,redHerrings:inv.solution.redHerrings,keyClues}};}
export async function getResult(id,sessionId){const inv=await authorized(id,sessionId);if(!inv)return null;if(!inv.verdict?.submitted)return false;return buildResult(inv,inv.verdict.suspectId);}
export function isValidId(id){return mongoose.isValidObjectId(id);}
