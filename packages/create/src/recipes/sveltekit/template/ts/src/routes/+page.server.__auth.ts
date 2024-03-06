export async function load({ locals }) {
  const session = locals.auth.session;
  const isSignedIn = await session.isSignedIn();
  const { client } = session;

  const builtinUIEnabled = await client.queryRequiredSingle<boolean>(
    `select exists ext::auth::UIConfig`
  );

  return {
    isSignedIn,
    builtinUIEnabled,
  };
}
