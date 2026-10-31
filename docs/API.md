# API Reference

Base path: `/api/v1`. Responses use `{ "success": boolean, "data": ... }`; errors include a stable `error.code`. All investigation routes are scoped to the signed anonymous session cookie.

## Create and inspect

`POST /investigations` accepts `scenario` (50–3,000 characters), `category`, `difficulty`, optional `title`, and `suspectCount`. It responds with HTTP 202 and an investigation ID plus a job ID. Poll `GET /investigations/:id/status` until `ready` or `failed`.

`GET /investigations/:id`, `/suspects`, `/evidence`, and `/timeline` expose only player-facing data. Evidence classification, internal explanations, and the solution are omitted. Evidence can also be read individually at `/evidence/:evidenceId`.

## Notes and verdict

Notes use `POST /notes` with `{ "content": "..." }`, `PATCH /notes/:noteId` with the same body, and `DELETE /notes/:noteId`.

Submit `{ "suspectId": "suspect_02" }` to `POST /verdict`. The server verifies ownership and suspect membership, compares against the stored culprit ID, records the first submission, and returns the solution. `GET /result` returns 403 before a verdict and returns the recorded result afterwards.
