import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { env } from '../config/env.js';
import { blueprintPrompt, evidencePrompt } from './prompts/case.prompt.js';

const caseSchema = z.object({
  title: z.string().min(1), description: z.string().min(1),
  suspects: z.array(z.object({ suspectId: z.string(), name: z.string(), age: z.number(), occupation: z.string(), relationshipToVictim: z.string(), background: z.string(), possibleMotive: z.string(), alibi: z.string() })).min(3),
  solution: z.object({ culpritId: z.string(), motive: z.string(), method: z.string(), opportunity: z.string(), explanation: z.string(), decisiveEvidenceIds: z.array(z.string()), decisiveEvidence: z.array(z.string()), redHerrings: z.array(z.string()).default([]) }),
  timeline: z.array(z.object({ eventId: z.string(), title: z.string(), description: z.string(), timestamp: z.string(), relatedSuspects: z.array(z.string()).default([]), relatedEvidence: z.array(z.string()).default([]) })).min(3),
  evidence: z.array(z.object({ evidenceId: z.string(), title: z.string(), type: z.enum(['chat','document','cctv','image','interrogation']), description: z.string(), content: z.record(z.unknown()), timestamp: z.string(), location: z.string(), relatedSuspects: z.array(z.string()), clueImportance: z.enum(['minor','moderate','major']), internalClassification: z.enum(['direct','circumstantial','red_herring']), internalExplanation: z.string() })).min(5)
});
const blueprintSchema = caseSchema.omit({ evidence: true });
const evidenceSchema = caseSchema.pick({ evidence: true });

function validateReferences(data, input) {
  const expected = input.difficulty === 'easy' ? 3 : input.difficulty === 'hard' ? 5 : Number(input.suspectCount || 4);
  if (data.suspects.length !== expected) throw new Error(`The generated case must contain ${expected} suspects.`);
  const [minEvidence, maxEvidence] = input.difficulty === 'easy' ? [5, 7] : input.difficulty === 'hard' ? [13, 18] : [8, 12];
  if (data.evidence.length < minEvidence || data.evidence.length > maxEvidence) throw new Error(`The generated case must contain ${minEvidence}–${maxEvidence} evidence items.`);
  const ids = data.suspects.map(s => s.suspectId);
  const names = data.suspects.map(s => s.name.trim().toLowerCase());
  if (new Set(ids).size !== ids.length || new Set(names).size !== names.length || !ids.includes(data.solution.culpritId)) throw new Error('The mystery blueprint has invalid suspect references.');
  const evidenceIds = data.evidence.map(e => e.evidenceId);
  if (new Set(evidenceIds).size !== evidenceIds.length || !data.solution.decisiveEvidenceIds.every(id => evidenceIds.includes(id))) throw new Error('The generated evidence references are inconsistent.');
  const allSuspectRefs = data.evidence.flatMap(e => e.relatedSuspects);
  if (allSuspectRefs.some(id => !ids.includes(id))) throw new Error('An evidence item references an unknown suspect.');
  data.timeline.forEach(event => {
    if (Number.isNaN(Date.parse(event.timestamp))) throw new Error('A timeline timestamp is invalid.');
    if (event.relatedSuspects.some(id => !ids.includes(id))) throw new Error('A timeline event references an unknown suspect.');
    if (event.relatedEvidence.some(id => !evidenceIds.includes(id))) throw new Error('A timeline event references unknown evidence.');
  });
  data.evidence.forEach(item => { if (Number.isNaN(Date.parse(item.timestamp))) throw new Error('An evidence timestamp is invalid.'); });
  return data;
}

export async function generateCase(input,onStage=()=>{}) {
  if (!env.geminiApiKey) throw new Error('Mystery generation is not configured yet. Add GEMINI_API_KEY to server/.env and restart the server.');
  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
  const expectedEvidence=input.difficulty==='easy'?'5-7':input.difficulty==='hard'?'13-18':'8-12';
  const count=input.difficulty==='easy'?3:input.difficulty==='hard'?5:Number(input.suspectCount||4);
  const base=`Create a ${input.difficulty} ${input.category} case with exactly ${count} suspects. Optional title: ${input.title || 'choose a fitting title'}. Premise: ${input.scenario}`;
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await onStage('analysing_scenario');
      const blueprintResponse=await ai.models.generateContent({model:env.geminiModel,contents:`${blueprintPrompt}\n\n${base}`,config:{responseMimeType:'application/json',temperature:0.65,maxOutputTokens:6000}});
      const blueprint=blueprintSchema.parse(JSON.parse(blueprintResponse.text));
      await onStage('building_investigation');
      await onStage('generating_evidence');
      const evidenceResponse=await ai.models.generateContent({model:env.geminiModel,contents:`${evidencePrompt}\n\nGenerate ${expectedEvidence} evidence items for this fixed blueprint.\n${JSON.stringify(blueprint)}`,config:{responseMimeType:'application/json',temperature:0.55,maxOutputTokens:10000}});
      const generatedEvidence=evidenceSchema.parse(JSON.parse(evidenceResponse.text));
      const parsed=caseSchema.parse({...blueprint,...generatedEvidence});
      return { data: validateReferences(parsed, input), attempts: attempt };
    } catch (error) { lastError = error; }
  }
  throw new Error(`The AI returned an invalid case after two attempts: ${lastError?.message || 'Unknown response error'}`);
}
