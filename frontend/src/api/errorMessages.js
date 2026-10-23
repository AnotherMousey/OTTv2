// A defensive display boundary for older/misconfigured servers. The API must
// still sanitize its responses; client-side checks are not access control.
const generic = 'Something went wrong. Please try again.';
export const unreadableResponse = 'The server returned an unexpected response. Please try again later.';

export function responseError(data, response) {
  const status = response.status;
  let message = typeof data?.error === 'string' ? data.error : '';
  const unsafe = /[\r\n]|Traceback|\bat\s+\S+\s*\(|(?:[A-Za-z]:[\\/]|\/(?:app|tmp|home|workspace|usr|srv)\/)|Prisma|SQLSTATE|VITE_|ALLOWED_ORIGINS|schema\/query|\b(?:password|token|secret)\s*[=:]/i;
  if (!message || message.length > 500 || unsafe.test(message)) message = generic;
  if (status >= 500) message = 'The service is temporarily unavailable. Please try again later.';
  if (status === 404 && message === 'API route not found.') message = 'This action is currently unavailable. Please try again later.';
  const referenceId = typeof data?.referenceId === 'string' && /^[a-f0-9-]{36}$/i.test(data.referenceId) ? data.referenceId : undefined;
  const code = typeof data?.code === 'string' && /^[A-Z0-9_]{1,64}$/.test(data.code) ? data.code : undefined;
  return Object.assign(Error(referenceId ? `${message} Reference: ${referenceId}` : message),
    { status, code, referenceId, retryAfter: response.headers?.get('Retry-After') || undefined });
}

export function connectionError(error, signal) {
  // User navigation cancellation remains silent in existing callers.
  if (signal?.aborted || error?.name === 'AbortError') return error;
  return Error('Unable to connect to the server. Check your connection and try again.');
}
