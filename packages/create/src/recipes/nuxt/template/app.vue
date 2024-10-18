<script setup lang="ts">
const { isLoggedIn } = useEdgeDbIdentity()

const links = computed(() => {
  const links = [
    {
      label: 'Home',
      icon: 'i-heroicons-home',
      to: '/',
    },
  ]

  if (isLoggedIn.value) {
    links.push(
      {
        label: 'New blogpost',
        icon: 'i-heroicons-newspaper-20-solid',
        to: '/new',
      },
      {
        label: 'Logout',
        icon: 'i-heroicons-newspaper-20-solid',
        to: '/auth/logout',
      },
    )
  }
  else {
    links.push(
      {
        label: 'Register',
        icon: 'i-heroicons-key-20-solid',
        to: '/auth/signup',
      },
      {
        label: 'Login',
        icon: 'i-heroicons-lock-open-20-solid',
        to: '/auth/login',
      },
      {
        label: 'Forgot my password',
        icon: 'i-heroicons-sparkles-20-solid',
        to: '/auth/forgot-password',
      },
    )
  }

  return links
})
</script>

<template>
  <UContainer class="p-8 flex flex-col gap-4">
    <UVerticalNavigation :links="links" />

    <div>
      <NuxtPage />
    </div>
  </UContainer>
</template>
