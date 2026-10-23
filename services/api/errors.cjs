const { randomUUID } = require('node:crypto');
const { ApiError } = require('../shared/domain.cjs');
const { schemaError, schemaDetails } = require('../shared/readiness.cjs');

const unavailable = 'The service is temporarily unavailable. Please try again later.';

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const schema = schemaError(error);
  const status = schema ? 503 : error.type === 'entity.too.large' ? 413
    : error.type === 'entity.parse.failed' ? 400 : error.code === 'P2002' ? 409
      : Number.isInteger(error.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
  if (error instanceof ApiError && status < 500)
    return res.status(status).json({ error: error.message });
  if (error.type === 'entity.parse.failed')
    return res.status(400).json({ error: 'The request could not be read. Please check it and try again.', code: 'INVALID_JSON' });
  if (error.type === 'entity.too.large')
    return res.status(413).json({ error: 'The request is too large. Please send a smaller file.', code: 'REQUEST_TOO_LARGE' });
  if (error.code === 'P2002')
    return res.status(409).json({ error: 'This record already exists.' });

  const referenceId = randomUUID();
  // Do not log request bodies, headers, raw exception messages or bot output.
  // The reference and safe context correlate failures without collecting secrets.
  console.error(JSON.stringify({ event: schema ? 'api.schema_error' : 'api.error', referenceId,
    method: req.method, route: req.route?.path || 'unmatched',
    ...(schema ? schemaDetails(error) : { code: /^[A-Z0-9_]{1,40}$/.test(error.code) ? error.code : 'UNKNOWN' }) }));
  return res.status(status).json({ error: status >= 500 ? unavailable : 'The request could not be completed. Please try again.',
    code: schema ? 'DATABASE_SCHEMA_OUTDATED' : 'REQUEST_FAILED', referenceId });
}

module.exports = { errorHandler, unavailable };
