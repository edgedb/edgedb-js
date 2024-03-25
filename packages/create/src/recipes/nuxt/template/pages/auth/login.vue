<template>
  <div class="login">
    <EdgeDbAuthEmailLogin
      v-slot="{ email, updateEmail, password, updatePassword, submit, loading }"
      redirect-to="/"
    >
      <UCard>
        <template #header>
          <h2>Login</h2>
        </template>

        <div class="flex flex-col gap-4">
          <UFormGroup label="Email">
            <UInput
              type="email"
              :value="email"
              placeholder="your@email.com"
              @change="(e: any) => updateEmail(e.target.value)"
              @keyup.enter="() => submit()"
            />
          </UFormGroup>
          <UFormGroup label="Password">
            <UInput
              type="password"
              :value="password"
              placeholder="password"
              @change="(e: any) => updatePassword(e.target.value)"
              @keyup.enter="() => submit()"
            />
          </UFormGroup>
        </div>

        <template #footer>
          <div class="flex items-center gap-2">
            <UButton
              type="button"
              color="gray"
              :loading="loading"
              @click="() => submit()"
            >
              Login
            </UButton>

            <OAuthProviders />
          </div>
        </template>
      </UCard>
    </EdgeDbAuthEmailLogin>
  </div>
</template>
