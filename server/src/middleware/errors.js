export function notFound(req, res) { res.status(404).json({ success: false, message: 'This case file could not be found.', error: { code: 'NOT_FOUND' } }); }
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message: status >= 500 ? 'The server could not complete that request.' : err.message, error: { code: err.code || (status === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR') } });
}
