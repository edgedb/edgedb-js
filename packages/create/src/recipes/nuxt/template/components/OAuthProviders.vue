<template>
  <EdgeDbAuthProviders v-slot="{ oAuthProviders: providers }">
    <EdgeDbOAuthButton
      v-for="provider of providers"
      :key="provider.name"
      v-slot="{ redirect }"
      :provider="provider.name"
    >
      <UButton @click="() => redirect()">
        {{ provider.display_name }}
      </UButton>
    </EdgeDbOAuthButton>
  </EdgeDbAuthProviders>
</template>
