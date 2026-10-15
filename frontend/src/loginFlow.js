export async function loginWithRefresh({authenticate, username, password, onAuthenticated, refresh, onRefreshError}) {
  const account = await authenticate(username, password);
  onAuthenticated(account);
  try { await refresh(); } catch(error) { onRefreshError(error); }
  return account;
}
