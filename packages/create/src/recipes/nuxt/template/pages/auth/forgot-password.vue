<template>
  <div class="login">
    <EdgeDbAuthSendPasswordReset
      v-slot="{ email, updateEmail, submit, loading }"
      redirect-to="/"
    >
      <UCard>
        <template #header>
          <h2>Forgot my password</h2>
        </template>
        <div class="flex flex-col gap-4">
          <UFormGroup label="Email">
            <UInput
              type="email"
              :value="email"
              placeholder="your@email.com"
              @change="(e: any) => updateEmail(e.target.value)"
            />
          </UFormGroup>
        </div>

        <template #footer>
          <UButton
            type="button"
            color="gray"
            :loading="loading"
            @click="(e) => submit()"
          >
            Send reset email
          </UButton>
        </template>
      </UCard>
    </EdgeDbAuthSendPasswordReset>
  </div>
</template>
