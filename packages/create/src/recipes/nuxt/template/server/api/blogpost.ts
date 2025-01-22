import { defineEventHandler, getQuery, isMethod, readBody } from 'h3'
import { useEdgeDbQueries } from '#edgedb/server'
import type { BlogPost } from '#edgedb/interfaces'

export default defineEventHandler(async (req) => {
  const { insertBlogPost, allBlogPosts, deleteBlogPost, getBlogPost } = useEdgeDbQueries(req)
  const query = getQuery(req)
  const id = query?.id as string | undefined

  if (isMethod(req, 'POST')) {
    const body = await readBody(req)
    const { title, description, content } = body

    const blogPost = await insertBlogPost({
      blogpost_title: title,
      blogpost_description: description,
      blogpost_content: content,
    })

    return blogPost
  }

  if (isMethod(req, 'GET')) {
    if (id) {
      const blogpost = await getBlogPost({ blogpost_id: id })
      return blogpost as BlogPost
    }

    const count = await useEdgeDb().query('select count(BlogPost);').then(([count]) => count)

    return count ? await allBlogPosts() : []
  }

  if (isMethod(req, 'DELETE') && id) {
    await deleteBlogPost({ blogpost_id: id })
    return { deleted: id }
  }
})
