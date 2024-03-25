<script setup lang="ts">
import type { BlogPost } from '~/dbschema/interfaces'

const { params } = useRoute()

const { data: blogpost } = await useAsyncData<BlogPost>(
  `blogpost-${params.id}`,
  async () => await $fetch(`/api/blogpost?id=${params.id}`),
)
</script>

<template>
  <UContainer class="p-8 flex flex-col gap-4">
    <UCard v-if="blogpost">
      <template #header>
        <h1>{{ blogpost?.title }}</h1>
        <p class="text-sm opacity-50">
          {{ blogpost?.description }}
        </p>
      </template>

      {{ blogpost.content }}

      <template #footer>
        <NuxtLink to="/">
          <UButton color="gray">
            Home
          </UButton>
        </NuxtLink>
      </template>
    </UCard>
  </UContainer>
</template>

<style scoped>
h1 {
  margin-bottom: 1.33rem;
}
</style>
