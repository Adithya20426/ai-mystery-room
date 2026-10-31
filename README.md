# AI Mystery Room

AI Mystery Room is a fictional investigation experience: a player supplies a premise, Gemini creates a structured case, and the player studies its suspects, evidence, and timeline before making an accusation.

## Stack

- `client`: React, Vite, React Router, Axios, Framer Motion, Lucide
- `server`: Node.js, Express, MongoDB/Mongoose, Gemini, Zod
- Anonymous case ownership uses a signed, HTTP-only session cookie.

## Requirements

- Node.js 20 or newer
- MongoDB (local or hosted)
- A Google Gemini API key

## Run locally

1. Copy `server/.env.example` to `server/.env` and configure `MONGODB_URI`, `GEMINI_API_KEY`, and a private `SESSION_SECRET`.
2. Optionally copy `client/.env.example` to `client/.env` if the API is not at `http://localhost:5000/api/v1`.
3. From the repository root, run `npm install`, `npm --prefix client install`, and `npm --prefix server install`.
4. Run `npm run dev` and open `http://localhost:5173`.

The client runs on port 5173 and the API on port 5000 by default. The API will not start without MongoDB configuration. Case creation requires `GEMINI_API_KEY`; provider failures appear as a failed generation job and do not expose the stored solution.

## Build

Run `npm run build` to create the production client bundle. Deploy the client and server separately, set `CLIENT_URL` to the deployed client origin, and use HTTPS in production so the session cookie is secure.

## API overview

All routes are under `/api/v1`. Requests use the session cookie automatically in the browser.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | API health check |
| POST | `/investigations` | Validate and queue a case |
| GET | `/investigations/:id/status` | Read generation state |
| GET | `/investigations/:id` | Read public case summary |
| GET | `/investigations/:id/suspects` | Read suspect profiles |
| GET | `/investigations/:id/evidence` | Read public evidence |
| GET | `/investigations/:id/evidence/:evidenceId` | Read an evidence item |
| GET | `/investigations/:id/timeline` | Read chronological events |
| POST/PATCH/DELETE | `/investigations/:id/notes[/:noteId]` | Manage private notes |
| POST | `/investigations/:id/verdict` | Submit a suspect ID and reveal the solution |
| GET | `/investigations/:id/result` | Read result after submission |

The solution and internal evidence classifications are excluded from public serializers. Verdict comparison happens on the server.

## Current integration boundary

Image evidence is stored as structured fictional descriptions and the viewer supports hosted image URLs. A production image-generation and object-storage provider still needs to be selected and configured; the text-generation workflow is independent of that optional asset integration.
