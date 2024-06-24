<template>
  <div class="login">
    <EdgeDbAuthEmailVerify
      v-slot="{ loading }"
      redirect-to="/"
    >
      <UCard>
        <template #header>
          <h2>Email verification</h2>
        </template>
        <UButton :loading="loading" color="gray">
          Loading...
        </UButton>
      </UCard>
    </EdgeDbAuthEmailVerify>
  </div>
</template>
