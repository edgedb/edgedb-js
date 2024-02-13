export async function load({ locals }) {
  const session = locals.auth.session;
  const isSignedIn = await session.isSignedIn();

  return {
    isSignedIn,
  };
}
