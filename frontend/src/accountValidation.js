export function validate(input, existing) {
  const value = {
    username: input.username.trim().toLowerCase(),
    name: input.name.trim(),
    password: input.password,
    role: input.role || "player",
  };
  value.name = value.name || value.username;
  const errors = {};
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(value.username))
    errors.username =
      "Use 3–32 letters, numbers, dots, underscores or hyphens.";
  else if (existing.has(value.username))
    errors.username = "This username already exists.";
  if (value.name.length < 2 || value.name.length > 80)
    errors.name = "Use 2–80 characters for the team name.";
  if (value.password.length < 12 || value.password.length > 128)
    errors.password = "Use a password with 12–128 characters.";
  if (!["player", "judge"].includes(value.role))
    errors.role = "Role must be player or judge.";
  return { value, errors };
}
export function csvRows(text) {
  const rows = [];
  let row = [],
    field = "",
    quoted = false,
    closed = false;
  text = text.replace(/^\uFEFF/, "");
  function cell() {
    row.push(field);
    field = "";
    closed = false;
  }
  function line() {
    cell();
    if (row.some((value) => value.trim())) rows.push(row);
    row = [];
  }
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += char;
    } else if (char === ",") cell();
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index++;
      line();
    } else if (closed) throw Error("Unexpected text after a quoted CSV field.");
    else if (char === '"') {
      if (field)
        throw Error("Quotes must start at the beginning of a CSV field.");
      quoted = true;
    } else field += char;
  }
  if (quoted)
    throw Error("A quoted CSV field is not closed. Check your pasted rows.");
  line();
  if (
    rows[0]?.[0].trim().toLowerCase() === "username" &&
    rows[0]?.[2]?.trim().toLowerCase() === "password"
  )
    rows.shift();
  return rows;
}
