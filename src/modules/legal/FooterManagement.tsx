import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../shared/ui/Card'
import { Button } from '../shared/ui/Button'
import { Input } from '../shared/ui/Input'
import { supabase } from '@shared/supabase'
import { Plus, Trash2, GripVertical } from 'lucide-react'

interface FooterLink {
  id: string
  label: string
  url: string
  sort_order: number
}

export default function FooterManagement() {
  const [links, setLinks] = useState<FooterLink[]>([])
  const [loading, setLoading] = useState(true)
  const [newLink, setNewLink] = useState({ label: '', url: '' })

  useEffect(() => {
    loadLinks()
  }, [])

  const loadLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('footer_links')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      setLinks(data || [])
    } catch (error) {
      console.error('Error loading footer links:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newLink.label || !newLink.url) return

    try {
      const { error } = await supabase
        .from('footer_links')
        .insert([{
          ...newLink,
          sort_order: links.length
        }])

      if (error) throw error
      setNewLink({ label: '', url: '' })
      loadLinks()
    } catch (error) {
      console.error('Error adding footer link:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('footer_links')
        .delete()
        .eq('id', id)

      if (error) throw error
      loadLinks()
    } catch (error) {
      console.error('Error deleting footer link:', error)
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
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Footer Management</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
              <Input
                value={newLink.label}
                onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                placeholder="Privacy Policy"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">URL</label>
              <Input
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                placeholder="/privacy"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footer Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
              >
                <GripVertical className="w-5 h-5 text-slate-400 cursor-move" />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{link.label}</p>
                  <p className="text-sm text-slate-500">{link.url}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(link.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {links.length === 0 && (
              <p className="text-center text-slate-500 py-8">No footer links added yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
