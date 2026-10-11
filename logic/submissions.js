const crypto = require('crypto');

const MAX_SOURCE_BYTES = 256 * 1024;
const submissions = new Map();
const LANGUAGES = new Set(['java', 'cpp', 'python']);

function normalizeSource(source) {
  if (typeof source !== 'string' || !source.trim()) {
    throw new Error('Source code is required.');
  }
  const bytes = Buffer.byteLength(source, 'utf8');
  if (bytes > MAX_SOURCE_BYTES) {
    throw new Error(`Source code must be at most ${MAX_SOURCE_BYTES} bytes.`);
  }
  return source;
}

function createSubmission({ playerId, source, language = 'java' }) {
  if (typeof playerId !== 'string' || !playerId.trim()) {
    throw new Error('playerId is required.');
  }
  language = String(language).toLowerCase();
  if (!LANGUAGES.has(language)) throw new Error('language must be java, cpp, or python.');
  const submission = {
    id: `SUB-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
    playerId: playerId.trim().slice(0, 100),
    language,
    source: normalizeSource(source),
    createdAt: new Date().toISOString(),
  };
  submissions.set(submission.id, submission);
  return publicSubmission(submission);
}

function getSubmission(id) {
  const submission = submissions.get(String(id || '').trim().toUpperCase());
  if (!submission) throw new Error('Submission not found.');
  return submission;
}

function publicSubmission(submission) {
  return {
    id: submission.id,
    playerId: submission.playerId,
    language: submission.language,
    createdAt: submission.createdAt,
  };
}

module.exports = {
  MAX_SOURCE_BYTES,
  LANGUAGES,
  submissions,
  createSubmission,
  getSubmission,
  publicSubmission,
};
