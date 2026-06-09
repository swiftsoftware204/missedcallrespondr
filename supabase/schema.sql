-- Missed Call Responder Database Schema
-- Run this in Supabase SQL Editor

-- Enable RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    domain TEXT UNIQUE,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3B82F6',
    phone_number TEXT,
    settings JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (with tenant isolation)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'tenant_user',
    tenant_id UUID REFERENCES tenants(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    company TEXT,
    source TEXT DEFAULT 'missed_call',
    status TEXT DEFAULT 'new',
    tags TEXT[],
    notes TEXT,
    assigned_to UUID REFERENCES users(id),
    last_contact_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calls table
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    lead_id UUID REFERENCES leads(id),
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    direction TEXT DEFAULT 'inbound',
    status TEXT DEFAULT 'missed',
    duration INTEGER DEFAULT 0,
    recording_url TEXT,
    external_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table (SMS)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    lead_id UUID REFERENCES leads(id),
    direction TEXT NOT NULL, -- 'inbound' or 'outbound'
    body TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    external_id TEXT,
    from_number TEXT,
    to_number TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline stages
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline cards (leads in stages)
CREATE TABLE IF NOT EXISTS pipeline_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    lead_id UUID NOT NULL REFERENCES leads(id),
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
    value DECIMAL(10,2),
    priority TEXT DEFAULT 'medium',
    assigned_to UUID REFERENCES users(id),
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Templates
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Queue (for auto-sending)
CREATE TABLE IF NOT EXISTS sms_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    to_number TEXT NOT NULL,
    template TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    call_id UUID REFERENCES calls(id),
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities/Notes
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    lead_id UUID REFERENCES leads(id),
    type TEXT NOT NULL, -- 'note', 'call', 'sms', 'email', 'status_change'
    content TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Tenants: Users can only see their own tenant
CREATE POLICY tenant_isolation ON tenants
    FOR ALL USING (id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
    ));

-- Users: Can see users in same tenant
CREATE POLICY user_tenant_isolation ON users
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
    ));

-- Leads: Tenant isolation
CREATE POLICY lead_tenant_isolation ON leads
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
    ));

-- Calls: Tenant isolation
CREATE POLICY call_tenant_isolation ON calls
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
    ));

-- Messages: Tenant isolation
CREATE POLICY message_tenant_isolation ON messages
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
    ));

-- Pipeline: Tenant isolation
CREATE POLICY pipeline_stage_tenant_isolation ON pipeline_stages
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY pipeline_card_tenant_isolation ON pipeline_cards
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
    ));

-- Templates: Tenant isolation
CREATE POLICY template_tenant_isolation ON sms_templates
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
    ));

-- Activities: Tenant isolation
CREATE POLICY activity_tenant_isolation ON activities
    FOR ALL USING (tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
    ));

-- Create indexes for performance
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_calls_tenant_id ON calls(tenant_id);
CREATE INDEX idx_calls_lead_id ON calls(lead_id);
CREATE INDEX idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX idx_messages_lead_id ON messages(lead_id);
CREATE INDEX idx_pipeline_cards_tenant_id ON pipeline_cards(tenant_id);
CREATE INDEX idx_pipeline_cards_stage_id ON pipeline_cards(stage_id);

-- Insert default pipeline stages
INSERT INTO pipeline_stages (name, position, color) VALUES
('New Lead', 1, '#3B82F6'),
('Contacted', 2, '#F59E0B'),
('Qualified', 3, '#8B5CF6'),
('Proposal', 4, '#EC4899'),
('Closed Won', 5, '#10B981'),
('Closed Lost', 6, '#6B7280');

-- Insert default SMS templates
INSERT INTO sms_templates (name, content, category, is_default) VALUES
('Missed Call - General', 'Sorry we missed your call! We''re here now - reply CALL to schedule a callback or INFO for our services.', 'missed_call', TRUE),
('Missed Call - Friendly', 'Thanks for calling! We couldn''t answer but want to help. What can we do for you?', 'missed_call', FALSE),
('Missed Call - Business Hours', 'You just missed us! We''re available Mon-Fri 9-5. Reply with your question or call back.', 'missed_call', FALSE);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_cards_updated_at BEFORE UPDATE ON pipeline_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_templates_updated_at BEFORE UPDATE ON sms_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
