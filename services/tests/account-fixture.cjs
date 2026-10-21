// In-memory persistence boundary for API tests. This is not a database integration test.
const { database, loadWithDatabase } = require("./helpers.cjs");
const { passwordHash, digest } = require("../shared/domain.cjs");
const db = database();
let users, sessions, settings, sequence;
const clone = (value) => structuredClone(value);
const duplicate = () =>
  Object.assign(Error("Unique username"), { code: "P2002" });
function matches(user, where) {
  return Object.entries(where || {}).every(([key, value]) =>
    value && typeof value === "object" && "in" in value
      ? value.in.includes(user[key])
      : user[key] === value,
  );
}
db.user.findUnique = async ({ where }) =>
  clone([...users.values()].find((user) => matches(user, where)) || null);
db.user.findMany = async ({ where } = {}) =>
  clone([...users.values()].filter((user) => matches(user, where)));
db.user.create = async ({ data }) => {
  if ([...users.values()].some((user) => user.username === data.username))
    throw duplicate();
  const user = {
    id: "account-" + ++sequence,
    active: true,
    rating: 1000,
    games: 0,
    lastDelta: 0,
    appearance: null,
    ...data,
  };
  users.set(user.id, user);
  return clone(user);
};
db.user.createMany = async ({ data }) => {
  for (const value of data) await db.user.create({ data: value });
  return { count: data.length };
};
db.user.update = async ({ where, data }) => {
  const user = [...users.values()].find((user) => matches(user, where));
  Object.assign(user, data);
  return clone(user);
};
db.user.updateMany = async ({ where, data }) => {
  const rows = [...users.values()].filter((user) => matches(user, where));
  rows.forEach((user) => Object.assign(user, data));
  return { count: rows.length };
};
db.session.findUnique = async ({ where }) => {
  const value = sessions.get(where.tokenHash);
  return value
    ? { ...clone(value), user: clone(users.get(value.userId)) }
    : null;
};
db.session.create = async ({ data }) => {
  sessions.set(data.tokenHash, clone(data));
  return clone(data);
};
db.session.deleteMany = async ({ where }) => {
  let count = 0;
  for (const [key, value] of sessions) {
    if (where.userId && where.userId !== value.userId) continue;
    if (typeof where.tokenHash === "string" && key !== where.tokenHash)
      continue;
    if (where.tokenHash?.not === key) continue;
    sessions.delete(key);
    count++;
  }
  return { count };
};
db.registrationSettings = {
  findUnique: async () => clone(settings),
  upsert: async ({ create }) => {
    settings ||= clone(create);
    return clone(settings);
  },
  update: async ({ data }) => {
    Object.assign(settings, data);
    return clone(settings);
  },
};
db.rateBucket.upsert = async () => ({ count: 1 });
db.tournament.findMany = async () => [];
db.tournament.count = async () => 0;
const transaction = async (callback) => {
  const before = {
    users: clone(users),
    sessions: clone(sessions),
    settings: clone(settings),
  };
  try {
    return await callback(db);
  } catch (error) {
    users = before.users;
    sessions = before.sessions;
    settings = before.settings;
    throw error;
  }
};
const { createApp } = loadWithDatabase("../api/index.cjs", db, transaction);
async function reset() {
  users = new Map();
  sessions = new Map();
  settings = null;
  sequence = 0;
  for (const role of ["judge", "player"]) {
    const account = await db.user.create({
      data: {
        username: role,
        name: role === "judge" ? "Judge One" : "Team Player",
        role,
        passwordHash: await passwordHash("OriginalPass2026!"),
      },
    });
    await db.session.create({
      data: {
        tokenHash: digest(role),
        userId: account.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  }
}
module.exports = {
  db,
  createApp,
  reset,
  users: () => [...users.values()],
  sessions: () => sessions,
};
