const { prisma, transaction } = require("../shared/db.cjs");
const {
  fail,
  username,
  text,
  passwordHash,
  verifyPassword,
  publicUser,
  digest,
} = require("../shared/domain.cjs");
const { rate } = require("./auth.cjs");
const POLICY = "players";
function accountInput(row, { playerOnly = false } = {}) {
  if (!row || typeof row !== "object" || Array.isArray(row))
    fail(400, "Each account must be an object.");
  const login = username(row.username),
    role = playerOnly ? "player" : row.role || "player";
  if (!["player", "judge"].includes(role))
    fail(400, "Role must be player or judge.");
  const name = text(
    row.name == null || (typeof row.name === "string" && !row.name.trim()) ? login : row.name,
    2,
    80,
    "Name",
  );
  if (
    typeof row.password !== "string" ||
    row.password.length < 12 ||
    row.password.length > 128
  )
    fail(400, "Password must contain 12-128 characters.");
  return { username: login, name, password: row.password, role };
}
async function policy(req, res) {
  const row = await prisma.registrationSettings.findUnique({
    where: { id: POLICY },
  });
  res.json({ enabled: row?.enabled === true });
}
// Both registration and toggles lock the same row; closure cannot race a new account.
async function lockedPolicy(tx) {
  await tx.registrationSettings.upsert({
    where: { id: POLICY },
    create: { id: POLICY, enabled: false },
    update: {},
  });
  await tx.$queryRaw`SELECT id FROM RegistrationSettings WHERE id=${POLICY} FOR UPDATE`;
  return tx.registrationSettings.findUnique({ where: { id: POLICY } });
}
async function setPolicy(req, res) {
  if (typeof req.body.enabled !== "boolean")
    fail(400, "enabled must be true or false.");
  const value = await transaction(async (tx) => {
    await lockedPolicy(tx);
    return tx.registrationSettings.update({
      where: { id: POLICY },
      data: { enabled: req.body.enabled },
    });
  });
  res.json({ enabled: value.enabled });
}
async function register(req, res) {
  await rate("register:" + req.ip, 15, 900);
  const current = await prisma.registrationSettings.findUnique({
    where: { id: POLICY },
  });
  if (!current?.enabled)
    fail(403, "Player registration is closed. Contact your organizer.");
  const input = accountInput(req.body, { playerOnly: true });
  if (input.password !== req.body.confirmPassword)
    fail(400, "The passwords do not match.");
  const hash = await passwordHash(input.password);
  const user = await transaction(async (tx) => {
    if (!(await lockedPolicy(tx)).enabled)
      fail(403, "Player registration is closed. Contact your organizer.");
    return tx.user.create({
      data: {
        username: input.username,
        name: input.name,
        role: "player",
        passwordHash: hash,
      },
    });
  });
  res.status(201).json({ account: publicUser(user) });
}
async function create(req, res) {
  const input = accountInput(req.body);
  const user = await prisma.user.create({
    data: {
      username: input.username,
      name: input.name,
      role: input.role,
      passwordHash: await passwordHash(input.password),
    },
  });
  res.status(201).json({ account: publicUser(user) });
}
function batchInput(body) {
  if (
    !Array.isArray(body.accounts) ||
    body.accounts.length < 1 ||
    body.accounts.length > 500
  )
    fail(400, "Provide 1-500 accounts per batch.");
  return body.accounts;
}
async function inspect(rows) {
  const names = new Set();
  const parsed = rows.map((row, index) => {
    try {
      const value = accountInput(row);
      if (names.has(value.username))
        fail(400, "Duplicate username in this batch.");
      names.add(value.username);
      return { line: index + 1, value };
    } catch (error) {
      if (error.status !== 400) throw error;
      return { line: index + 1, error: error.message };
    }
  });
  const existing = await prisma.user.findMany({
      where: { username: { in: [...names] } },
      select: { username: true },
    }),
    taken = new Set(existing.map((row) => row.username));
  return parsed.map((row) =>
    row.value && taken.has(row.value.username)
      ? { ...row, error: "This username already exists." }
      : row,
  );
}
async function review(req, res) {
  const rows = await inspect(batchInput(req.body));
  res.json({
    rows: rows.map(({ line, value, error }) => ({
      line,
      username: value?.username,
      name: value?.name,
      role: value?.role,
      error: error || "",
    })),
  });
}
async function bulk(req, res) {
  const rows = await inspect(batchInput(req.body));
  if (rows.some((row) => row.error))
    fail(
      400,
      "Some accounts are invalid or already exist. Review the list again.",
    );
  // Hash before entering the transaction. Never persist or return plaintext passwords.
  const data = [];
  for (const { value } of rows)
    data.push({
      username: value.username,
      name: value.name,
      role: value.role,
      passwordHash: await passwordHash(value.password),
    });
  const accounts = await transaction(async (tx) => {
    await tx.user.createMany({ data });
    return tx.user.findMany({
      where: { username: { in: data.map((row) => row.username) } },
    });
  });
  res.status(201).json({ accounts: accounts.map(publicUser) });
}
async function profile(req, res) {
  const name = text(req.body.name, 2, 80, "Name");
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { name },
  });
  res.json({ account: publicUser(user) });
}
async function password(req, res) {
  await rate("password:" + req.user.id, 10, 900);
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (
    typeof currentPassword !== "string" ||
    !(await verifyPassword(currentPassword, req.user.passwordHash))
  )
    fail(400, "Current password does not match.");
  if (newPassword === currentPassword)
    fail(400, "Choose a password different from your current one.");
  if (newPassword !== confirmPassword)
    fail(400, "The new passwords do not match.");
  const hash = await passwordHash(newPassword),
    tokenHash = digest(req.headers.authorization.replace(/^Bearer /i, ""));
  await transaction(async (tx) => {
    const changed = await tx.user.updateMany({
      where: { id: req.user.id, passwordHash: req.user.passwordHash },
      data: { passwordHash: hash },
    });
    if (changed.count !== 1)
      fail(409, "Password changed elsewhere. Reload and try again.");
    await tx.session.deleteMany({
      where: { userId: req.user.id, tokenHash: { not: tokenHash } },
    });
  });
  res.json({ ok: true });
}
module.exports = {
  policy,
  setPolicy,
  register,
  create,
  review,
  bulk,
  profile,
  password,
  accountInput,
};
