-- Missed Call Responder - Complete Database Schema
-- With Super Admin, Team/VAs, and Enhanced Permissions

-- ============================================
-- CORE TABLES
-- ============================================

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
    plan TEXT DEFAULT 'basic',
    billing_email TEXT,
    max_users INTEGER DEFAULT 5,
    max_leads INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (supports super admin, tenant admin, team members, VAs)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'tenant_user', -- 'super_admin', 'tenant_admin', 'manager', 'user', 'va'
    tenant_id UUID REFERENCES tenants(id),
    assigned_tenants UUID[], -- For VAs: which tenants they can access
    permissions JSONB DEFAULT '{}', -- Custom permissions per user
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team/VA Assignments table
CREATE TABLE IF NOT EXISTS team_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    va_id UUID NOT NULL REFERENCES users(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    assigned_by UUID REFERENCES users(id),
    permissions JSONB DEFAULT '{}', -- What this VA can do for this tenant
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- LEADS & CONTACTS
-- ============================================

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
    assigned_by UUID REFERENCES users(id),
    last_contact_at TIMESTAMPTZ,
    custom_fields JSONB DEFAULT '{}',
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
    call_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table (SMS)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    lead_id UUID REFERENCES leads(id),
    direction TEXT NOT NULL,
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

-- ============================================
-- PIPELINE & KANBAN
-- ============================================

-- Pipeline stages
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline cards
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

-- ============================================
-- SMS & TEMPLATES
-- ============================================

-- SMS Templates
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    is_default BOOLEAN DEFAULT FALSE,
    variables TEXT[],
    created_by UUID REFERENCES users(id),
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
    lead_id UUID REFERENCES leads(id),
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACTIVITIES & AUDIT
-- ============================================

-- Activities/Notes
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    lead_id UUID REFERENCES leads(id),
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log for super admin
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    tenant_id UUID REFERENCES tenants(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXPORTS & INTEGRATIONS
-- ============================================

-- Export history
CREATE TABLE IF NOT EXISTS exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    export_type TEXT NOT NULL, -- 'leads', 'analytics', 'calls', 'messages'
    format TEXT NOT NULL, -- 'csv', 'excel', 'pdf', 'json'
    filters JSONB DEFAULT '{}',
    file_url TEXT,
    status TEXT DEFAULT 'pending',
    record_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Webhook subscriptions (for Zapier/Make integrations)
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT[], -- ['lead.created', 'call.missed', 'sms.sent']
    is_active BOOLEAN DEFAULT TRUE,
    secret TEXT, -- For webhook signature verification
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys for external integrations
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    permissions JSONB DEFAULT '{}',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Super Admin can do everything
CREATE POLICY super_admin_all ON tenants FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY super_admin_users ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Tenants: Users can see their own tenant
CREATE POLICY tenant_isolation ON tenants FOR ALL USING (
    id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Users: Can see users in same tenant or assigned tenants (for VAs)
CREATE POLICY user_tenant_isolation ON users FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR id = auth.uid()
    OR EXISTS (SELECT 1 FROM team_assignments WHERE va_id = auth.uid() AND tenant_id = users.tenant_id)
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Team assignments: VAs can see their assignments
CREATE POLICY team_assignment_va ON team_assignments FOR ALL USING (
    va_id = auth.uid()
    OR assigned_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Leads: Tenant isolation + VA access
CREATE POLICY lead_tenant_isolation ON leads FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR tenant_id IN (SELECT tenant_id FROM team_assignments WHERE va_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Calls: Tenant isolation
CREATE POLICY call_tenant_isolation ON calls FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR tenant_id IN (SELECT tenant_id FROM team_assignments WHERE va_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Messages: Tenant isolation
CREATE POLICY message_tenant_isolation ON messages FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR tenant_id IN (SELECT tenant_id FROM team_assignments WHERE va_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Pipeline: Tenant isolation
CREATE POLICY pipeline_stage_tenant_isolation ON pipeline_stages FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY pipeline_card_tenant_isolation ON pipeline_cards FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR tenant_id IN (SELECT tenant_id FROM team_assignments WHERE va_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Templates: Tenant isolation
CREATE POLICY template_tenant_isolation ON sms_templates FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Activities: Tenant isolation
CREATE POLICY activity_tenant_isolation ON activities FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR tenant_id IN (SELECT tenant_id FROM team_assignments WHERE va_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Audit logs: Super admin only
CREATE POLICY audit_logs_super_admin ON audit_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Exports: Tenant isolation
CREATE POLICY exports_tenant_isolation ON exports FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- Webhooks: Tenant isolation
CREATE POLICY webhooks_tenant_isolation ON webhook_subscriptions FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- API keys: Tenant isolation
CREATE POLICY api_keys_tenant_isolation ON api_keys FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_calls_tenant_id ON calls(tenant_id);
CREATE INDEX idx_calls_lead_id ON calls(lead_id);
CREATE INDEX idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX idx_messages_lead_id ON messages(lead_id);
CREATE INDEX idx_pipeline_cards_tenant_id ON pipeline_cards(tenant_id);
CREATE INDEX idx_pipeline_cards_stage_id ON pipeline_cards(stage_id);
CREATE INDEX idx_team_assignments_va_id ON team_assignments(va_id);
CREATE INDEX idx_team_assignments_tenant_id ON team_assignments(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default pipeline stages
INSERT INTO pipeline_stages (name, position, color, is_default) VALUES
('New Lead', 1, '#3B82F6', TRUE),
('Contacted', 2, '#F59E0B', TRUE),
('Qualified', 3, '#8B5CF6', TRUE),
('Proposal', 4, '#EC4899', TRUE),
('Closed Won', 5, '#10B981', TRUE),
('Closed Lost', 6, '#6B7280', TRUE);

-- Insert default SMS templates
INSERT INTO sms_templates (name, content, category, is_default) VALUES
('Missed Call - General', 'Sorry we missed your call! We''re here now - reply CALL to schedule a callback or INFO for our services.', 'missed_call', TRUE),
('Missed Call - Friendly', 'Thanks for calling! We couldn''t answer but want to help. What can we do for you?', 'missed_call', FALSE),
('Missed Call - Business Hours', 'You just missed us! We''re available Mon-Fri 9-5. Reply with your question or call back.', 'missed_call', FALSE);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

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

-- Function to log audit trail
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, tenant_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
        auth.uid(),
        NEW.tenant_id,
        TG_OP,
        TG_TABLE_NAME,
        NEW.id,
        CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
        row_to_json(NEW)
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add audit triggers to important tables
CREATE TRIGGER audit_leads AFTER INSERT OR UPDATE OR DELETE ON leads
    FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_calls AFTER INSERT OR UPDATE ON calls
    FOR EACH ROW EXECUTE FUNCTION log_audit();

CREATE TRIGGER audit_messages AFTER INSERT OR UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION log_audit();
