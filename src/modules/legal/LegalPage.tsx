import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent } from '../shared/ui/Card'
import { supabase } from '@shared/supabase'

interface LegalPage {
  id: string
  slug: string
  title: string
  content: string
  updated_at: string
}

export default function LegalPage() {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState<LegalPage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPage()
  }, [slug])

  const loadPage = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single()

      if (error) throw error
      setPage(data)
    } catch (error) {
      console.error('Error loading legal page:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!page) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4">
        <Card>
          <CardContent className="text-center py-12">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Page Not Found</h1>
            <p className="text-slate-500">The legal page you're looking for doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fix: Add type annotation for 'l' parameter
  const displayTitle = page?.title || slug?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Legal Page'

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Card>
        <CardContent className="py-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{displayTitle}</h1>
          <p className="text-sm text-slate-500 mb-8">
            Last updated: {new Date(page.updated_at).toLocaleDateString()}
          </p>
          <div 
            className="prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
