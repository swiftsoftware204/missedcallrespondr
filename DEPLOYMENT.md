# Missed Call Responder - Deployment Guide

## Quick Start

### 1. Supabase Setup

1. Create project at https://supabase.com
2. Go to SQL Editor
3. Run `supabase/schema.sql`
4. Go to Project Settings → API → Copy URL and anon key
5. Update `.env` file with Supabase credentials

### 2. Deploy Edge Functions

```powershell
# Run the deployment script
.\deploy-backend.ps1
```

Or manually:
```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase functions deploy telnyx-sms
npx supabase functions deploy telnyx-webhook
npx supabase functions deploy provision-user
npx supabase secrets set TELNYX_API_KEY=KEY019...
```

### 3. Telnyx Configuration

1. Go to https://portal.telnyx.com
2. Messaging → Webhooks → Add endpoint
3. URL: `https://your-project.supabase.co/functions/v1/telnyx-webhook`
4. Select events: `message.received`, `call.hangup`

### 4. Netlify Deployment

1. Connect GitHub repo to Netlify
2. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

## Architecture

```
Frontend (Netlify)
    ↓
Supabase (Auth + Database)
    ↓
Edge Functions
    ↓
Telnyx API (SMS/Voice)
```

## Features

- ✅ Missed call detection
- ✅ Auto SMS response
- ✅ Lead management
- ✅ Kanban board
- ✅ Two-way SMS
- ✅ Analytics dashboard
- ✅ Multi-tenant

## Security

- RLS enabled on all tables
- API keys in Supabase secrets
- CORS configured
- Input validation
- Audit logging

## Support

For issues, check:
1. Supabase Functions logs
2. Telnyx webhook logs
3. Browser console
