# Backend Deployment Script for Missed Call Responder
# Run this to deploy Supabase edge functions

Write-Host "Deploying Missed Call Responder Backend..." -ForegroundColor Green

# Check if Supabase CLI is available
$supabaseVersion = npx supabase --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing Supabase CLI..." -ForegroundColor Yellow
    npm install -g supabase
}

# Login to Supabase (if not already logged in)
Write-Host "`nChecking Supabase login status..." -ForegroundColor Cyan
npx supabase status 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please login to Supabase:" -ForegroundColor Yellow
    npx supabase login
}

# Link project (if not already linked)
Write-Host "`nLinking to Supabase project..." -ForegroundColor Cyan
npx supabase link --project-ref your-project-ref

# Deploy edge functions
Write-Host "`nDeploying edge functions..." -ForegroundColor Cyan

Write-Host "Deploying telnyx-sms function..." -ForegroundColor Gray
npx supabase functions deploy telnyx-sms

Write-Host "Deploying telnyx-webhook function..." -ForegroundColor Gray
npx supabase functions deploy telnyx-webhook

Write-Host "Deploying provision-user function..." -ForegroundColor Gray
npx supabase functions deploy provision-user

# Set secrets
Write-Host "`nSetting environment secrets..." -ForegroundColor Cyan
Write-Host "Please enter your Telnyx API Key:"
$telnyxKey = Read-Host -AsSecureString
$telnyxKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($telnyxKey))

npx supabase secrets set TELNYX_API_KEY=$telnyxKeyPlain

Write-Host "`n✅ Backend deployment complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Configure Telnyx webhook URL in your Telnyx dashboard"
Write-Host "2. Deploy frontend to Netlify"
Write-Host "3. Test the system"
