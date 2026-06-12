import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../shared/ui/Card'
import { Button } from '../shared/ui/Button'
import { Input } from '../shared/ui/Input'
import { supabase } from '@shared/supabase'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'

interface LegalPage {
  id: string
  slug: string
  title: string
  content: string
  is_published: boolean
  updated_at: string
}

export default function AdminLegalPages() {
  const [pages, setPages] = useState<LegalPage[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPage, setEditingPage] = useState<LegalPage | null>(null)
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    content: '',
    is_published: true
  })

  useEffect(() => {
    loadPages()
  }, [])

  const loadPages = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_pages')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setPages(data || [])
    } catch (error) {
      console.error('Error loading legal pages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      if (editingPage) {
        const { error } = await supabase
          .from('legal_pages')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPage.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('legal_pages')
          .insert([{
            ...formData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])

        if (error) throw error
      }

      setEditingPage(null)
      setFormData({ slug: '', title: '', content: '', is_published: true })
      loadPages()
    } catch (error) {
      console.error('Error saving legal page:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return

    try {
      const { error } = await supabase
        .from('legal_pages')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadPages()
    } catch (error) {
      console.error('Error deleting legal page:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Legal Pages</h1>
        <Button onClick={() => {
          setEditingPage(null)
          setFormData({ slug: '', title: '', content: '', is_published: true })
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Page
        </Button>
      </div>

      {editingPage !== null && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{editingPage ? 'Edit Page' : 'New Page'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="privacy-policy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Privacy Policy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content (HTML)</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label className="text-sm text-slate-700">Published</label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave}>Save</Button>
                <Button variant="outline" onClick={() => setEditingPage(null)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {pages.map((page) => (
          <Card key={page.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <h3 className="font-semibold text-slate-900">{page.title}</h3>
                <p className="text-sm text-slate-500">/{page.slug}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  page.is_published 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {page.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/${page.slug}`, '_blank')}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingPage(page)
                    setFormData({
                      slug: page.slug,
                      title: page.title,
                      content: page.content,
                      is_published: page.is_published
                    })
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(page.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
