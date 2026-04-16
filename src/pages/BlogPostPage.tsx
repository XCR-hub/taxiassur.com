import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { SEOHead } from '@/components/SEOHead'

interface BlogPostData {
  slug: string
  title: string
  content: string
  excerpt: string
  meta_title: string
  meta_description: string
  author: string
  created_at: string
  keywords: string
}

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<BlogPostData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPost() {
      if (!slug) return
      const { data } = await supabase
        .from('blog_posts')
        .select('slug, title, content, excerpt, meta_title, meta_description, author, created_at, keywords')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle()

      if (data) setPost(data)
      setLoading(false)
    }
    fetchPost()
  }, [slug])

  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  if (!post) {
    return (
      <div className="not-found">
        <h1>Article non trouve</h1>
        <a href="/blog" className="cta-button">Retour au blog</a>
      </div>
    )
  }

  return (
    <>
      <SEOHead
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt}
        canonical={`/blog/${post.slug}`}
        keywords={post.keywords}
        type="article"
      />
      <article className="blog-post">
        <header className="post-header">
          <h1>{post.title}</h1>
          <div className="post-meta">
            <span>{post.author}</span>
            <time>{new Date(post.created_at).toLocaleDateString('fr-FR')}</time>
          </div>
        </header>
        <div
          className="post-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </>
  )
}
