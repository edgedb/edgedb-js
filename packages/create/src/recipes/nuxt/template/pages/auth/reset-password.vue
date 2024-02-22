<template>
  <div class="login">
    <EdgeDbAuthResetPassword
      v-slot="{ password, updatePassword, submit, loading }"
      redirect-to="/auth/login"
    >
      <UCard>
        <template #header>
          <h2>Reset my password</h2>
        </template>
        <div class="flex flex-col gap-4">
          <UFormGroup label="Password">
            <UInput
              type="password"
              :value="password"
              placeholder="your@email.com"
              @change="(e: any) => updatePassword(e.target.value)"
            />
          </UFormGroup>
        </div>

        <template #footer>
          <UButton
            type="button"
            color="gray"
            :loading="loading"
            @click="() => submit()"
          >
            Send reset email
          </UButton>
        </template>
      </UCard>
    </EdgeDbAuthResetPassword>
  </div>
</template>
