<script setup lang="ts">
import type { BlogPost } from '#edgedb/interfaces'

const { isLoggedIn } = useEdgeDbIdentity()

const { data, refresh } = await useAsyncData<BlogPost[]>(
  'blogpost-index',
  async () => await $fetch('/api/blogpost'),
)

async function deleteBlogPost(id: string) {
  await $fetch('/api/blogpost', {
    method: 'DELETE',
    query: { id },
  })

  await refresh()
}
</script>

<template>
  <UContainer class="p-8 flex flex-col gap-4">
    <UCard
      v-for="blogpost of data"
      :key="blogpost.id"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <h2>{{ blogpost.title }}</h2>
        </div>
      </template>

      <p class="text-sm opacity-50">
        {{ blogpost.description }}
      </p>

      <template #footer>
        <div class="flex items-center justify-between">
          <div>
            <UButton color="gray">
              <NuxtLink :to="`/blogposts/${blogpost.id}`">
                Read more
              </NuxtLink>
            </UButton>
          </div>

          <div
            v-if="isLoggedIn"
            class="cursor-pointer"
            @click="() => deleteBlogPost(blogpost.id)"
          >
            <UButton icon="i-heroicons-trash" color="red" variant="outline">
              <NuxtLink :to="`/blogposts/${blogpost.id}`">
                Delete
              </NuxtLink>
            </UButton>
          </div>
        </div>
      </template>
    </UCard>
  </UContainer>
</template>
