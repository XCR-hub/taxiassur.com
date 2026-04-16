import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { SEOHead } from '@/components/SEOHead'

interface BlogPost {
  slug: string
  title: string
  excerpt: string
  author: string
  created_at: string
}

export function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPosts() {
      const { data } = await supabase
        .from('blog_posts')
        .select('slug, title, excerpt, author, created_at')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(20)

      if (data) setPosts(data)
      setLoading(false)
    }
    fetchPosts()
  }, [])

  return (
    <>
      <SEOHead
        title="Blog Assurance Taxi - Actualites et Conseils | TaxiAssur"
        description="Retrouvez nos articles sur l'assurance taxi : actualites, conseils, guides pratiques pour les chauffeurs de taxi."
        canonical="/blog"
        keywords="blog assurance taxi, actualites taxi, conseils assurance taxi"
      />
      <div className="blog-page">
        <h1>Blog Assurance Taxi</h1>
        {loading ? (
          <div className="loading-container"><div className="spinner" /></div>
        ) : (
          <div className="blog-grid">
            {posts.map(post => (
              <Link to={`/blog/${post.slug}`} className="blog-card" key={post.slug}>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
                <div className="blog-meta">
                  <span>{post.author}</span>
                  <span>{new Date(post.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
