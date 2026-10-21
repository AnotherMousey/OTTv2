export async function loginWithRefresh({authenticate, username, password, onAuthenticated, refresh, onRefreshError}) {
  const account = await authenticate(username, password);
  onAuthenticated(account);
  // Tournament requests must not keep a successful login on the login form.
  void Promise.resolve().then(refresh).catch(onRefreshError);
  return account;
}
