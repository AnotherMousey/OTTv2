const path = require("node:path");

function database() {
  const db = {};
  const methods = [
    "findUnique",
    "findFirst",
    "findMany",
    "count",
    "groupBy",
    "create",
    "createMany",
    "update",
    "updateMany",
    "upsert",
    "deleteMany",
  ];
  for (const model of [
    "user",
    "session",
    "entry",
    "tournament",
    "match",
    "submission",
    "job",
    "frame",
    "audit",
    "syncReceipt",
    "rateBucket",
    "dailyBatch",
    "dailyStanding",
  ]) {
    db[model] = Object.fromEntries(
      methods.map((method) => [
        method,
        async () => {
          throw Error(`Unexpected database call: ${model}.${method}`);
        },
      ]),
    );
  }
  db.$queryRaw = async () => [];
  db.$executeRaw = async () => { throw Error("Unexpected raw write"); };
  return db;
}

// Unit boundary only: no Prisma client, connection, or migration is created.
function loadWithDatabase(
  modulePath,
  db,
  transaction = (callback) => callback(db),
) {
  const filename = require.resolve("../shared/db.cjs");
  require.cache[filename] = {
    id: filename,
    filename,
    loaded: true,
    exports: { prisma: db, transaction },
  };
  return require(path.resolve(__dirname, modulePath));
}

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

module.exports = { database, loadWithDatabase, response };
