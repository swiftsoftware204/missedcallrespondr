import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, Phone } from 'lucide-react'
import { useAuthStore } from './authStore'
import { Button } from '@shared/ui/Button'
import { Input } from '@shared/ui/Input'
import { toast } from '@shared/ui'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const { signIn, loading } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await signIn(email, password) }
    catch (err) { toast('error', err instanceof Error ? err.message : 'Login failed') }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4">
            <Phone size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CallBack Pro</h1>
          <p className="text-slate-400 mt-1 text-sm">Missed Call Text-Back Platform</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input label="Email address" type="email" placeholder="you@company.com"
              value={email} onChange={e => setEmail(e.target.value)} icon={<Mail size={16} />} required />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPw ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button type="submit" loading={loading} size="lg" className="mt-2">Sign In</Button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-6">Access is provided by your agency administrator.</p>
        </div>
      </div>
    </div>
  )
}