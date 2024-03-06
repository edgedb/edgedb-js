<script>
  import clientAuth from "$lib/auth";

  export let data;
</script>

<main>
  <h1>Welcome to SvelteKit</h1>
  <p>
    Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation
  </p>

  {#if data.isSignedIn}
    <p>You are signed in. <a href={clientAuth.getSignoutUrl()}>Sign Out</a></p>
  {:else}
    <br />
    <p>You are not signed in.</p>
    <a href={clientAuth.getBuiltinUIUrl()}>Sign In with Builtin UI</a>
    {#if !data.builtinUIEnabled}
      <p>
        In order to signin you need to firstly enable the built-in UI in the
        auth config.
      </p>
    {/if}
  {/if}
</main>
