const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDirectory = path.resolve(process.env.DATA_DIR || path.join(__dirname, '../data'));
const accountFile = path.join(dataDirectory, 'account.json');
const accounts = new Map();
const sessions = new Map();

function ensureDirectory() {
  fs.mkdirSync(dataDirectory, {recursive: true, mode: 0o700});
}

function readAccounts() {
  ensureDirectory();
  if (!fs.existsSync(accountFile)) return [];
  const source = fs.readFileSync(accountFile, 'utf8');
  const json = source.split(/\r?\n/).filter(line => !/^\s*%/.test(line)).join('\n').trim();
  if (!json) return [];
  const records = JSON.parse(json);
  if (Array.isArray(records)) return records;
  if (!records || typeof records !== 'object') throw new Error('account.json must contain date groups.');
  return Object.values(records).flat(); 
}

function writeAccounts() {
  ensureDirectory();
  const grouped = new Map();
  for (const account of [...accounts.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const date = new Date(account.createdAt).toLocaleDateString('en-US', {timeZone: 'UTC'});
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date).push(account);
  }
  const groupedJson = Object.fromEntries(grouped);
  const temp = `${accountFile}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(groupedJson, null, 2)}\n`, {mode: 0o600});
  fs.renameSync(temp, accountFile);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  if (typeof password !== 'string' || password.length < 8) throw new Error('Password must be at least 8 characters.');
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

async function verifyPassword(password, encoded) {
  const [salt, expected] = String(encoded || '').split(':');
  if (!salt || !expected || typeof password !== 'string' || password.length < 8) return false;
  const actual = hashPassword(password, salt).split(':')[1];
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function publicAccount(account) {
  return {username: account.username, role: account.role, createdAt: account.createdAt, active: account.active};
}

function normalizeUsername(username) {
  const value = String(username || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(value)) throw new Error('Username must contain 3-32 letters, numbers, dots, underscores, or hyphens.');
  return value;
}

function load() {
  for (const account of readAccounts()) accounts.set(account.username, account);
  const operatorUsername = process.env.OPERATOR_USERNAME;
  const operatorPassword = process.env.OPERATOR_PASSWORD;
  if (operatorUsername && operatorPassword && !accounts.has(normalizeUsername(operatorUsername))) {
    return createAccount({username: operatorUsername, password: operatorPassword, role: 'operator'});
  }
  return null;
}

function createAccount({username, password, role = 'player'}) {
  username = normalizeUsername(username);
  if (!['operator', 'player'].includes(role)) throw new Error('Invalid account role.');
  if (accounts.has(username)) throw new Error('Account already exists.');
  const account = {username, passwordHash: hashPassword(password), role, active: true, createdAt: new Date().toISOString()};
  accounts.set(username, account);
  writeAccounts();
  return publicAccount(account);
}

function login(username, password) {
  return (async () => {
    const account = accounts.get(normalizeUsername(username));
    if (!account || !account.active || !(await verifyPassword(password, account.passwordHash))) throw new Error('Invalid username or password.');
    const token = crypto.randomBytes(32).toString('base64url');
    sessions.set(token, {username: account.username, expiresAt: Date.now() + 24 * 60 * 60 * 1000});
    return {token, account: publicAccount(account)};
  })();
}

function logout(token) { sessions.delete(String(token || '').replace(/^Bearer\s+/i, '')); }

function authenticate(token) {
  const session = sessions.get(String(token || '').replace(/^Bearer\s+/i, ''));
  if (!session || session.expiresAt < Date.now()) throw new Error('Authentication required.');
  const account = accounts.get(session.username);
  if (!account || !account.active) throw new Error('Account is disabled.');
  return account;
}

function requireRole(token, role) {
  const account = authenticate(token);
  if (account.role !== role) throw new Error('Operator authorization required.');
  return account;
}

load();
module.exports = {accounts, createAccount, login, logout, authenticate, requireRole, publicAccount, accountFile};
