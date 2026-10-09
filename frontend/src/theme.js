export function initialTheme(storage, prefersDark = false) {
  try {
    const saved = storage?.getItem("ott-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* Restricted storage must not prevent the UI from opening. */
  }
  return prefersDark ? "dark" : "light";
}
export function persistTheme(storage, theme) {
  try {
    storage?.setItem("ott-theme", theme);
  } catch {
    /* Session toggle still works. */
  }
}
