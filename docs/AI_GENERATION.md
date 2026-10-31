# AI Generation

Gemini calls are made from the server with a configurable model. Prompts live under `server/src/ai/prompts`; responses are parsed as JSON and checked with Zod plus deterministic reference and difficulty validation before persistence.

The generation prompt establishes the culprit, motive, method, opportunity, and timeline before asking for suspect and evidence data in the same structured response. This preserves the invariant that evidence is built around a predetermined truth. Invalid output receives one controlled retry. Generation status and errors are recorded on the case/job.

Do not expose `solution`, `internalClassification`, or `internalExplanation` before verdict submission. Image generation and remote asset storage are extension points; image evidence currently carries structured descriptions and can render a hosted URL when supplied.
