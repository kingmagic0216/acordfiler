-- ACORD Intake Platform Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Management
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT 'user_' || substr(md5(random()::text), 1, 8),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT DEFAULT 'CUSTOMER' CHECK (role IN ('ADMIN', 'BROKER', 'CUSTOMER')),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING')),
    avatar TEXT,
    phone TEXT,
    timezone TEXT DEFAULT 'UTC',
    agency_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Agency/Tenant Management
CREATE TABLE agencies (
    id TEXT PRIMARY KEY DEFAULT 'agency_' || substr(md5(random()::text), 1, 8),
    name TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    logo TEXT,
    primary_color TEXT DEFAULT '#1e3a8a',
    accent_color TEXT DEFAULT '#3b82f6',
    settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint
ALTER TABLE users ADD CONSTRAINT fk_users_agency FOREIGN KEY (agency_id) REFERENCES agencies(id);

-- Authentication Sessions
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY DEFAULT 'session_' || substr(md5(random()::text), 1, 8),
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Form Submissions
CREATE TABLE submissions (
    id TEXT PRIMARY KEY DEFAULT 'sub_' || substr(md5(random()::text), 1, 8),
    submission_id TEXT UNIQUE NOT NULL,
    
    -- Business Information
    business_name TEXT NOT NULL,
    federal_id TEXT NOT NULL,
    business_type TEXT NOT NULL,
    years_in_business INTEGER NOT NULL,
    business_description TEXT NOT NULL,
    website TEXT,
    
    -- Contact Information
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    
    -- Coverage Information
    coverage_types JSONB NOT NULL,
    coverage_responses JSONB,
    
    -- Client Type
    client_type TEXT DEFAULT 'BUSINESS' CHECK (client_type IN ('PERSONAL', 'BUSINESS', 'BOTH')),
    
    -- Status and Priority
    status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW', 'REVIEW', 'SIGNATURE', 'COMPLETED', 'REJECTED', 'CANCELLED')),
    priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    
    -- Assignment
    broker_id TEXT,
    agency_id TEXT,
    
    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    FOREIGN KEY (broker_id) REFERENCES users(id),
    FOREIGN KEY (agency_id) REFERENCES agencies(id)
);

-- Document Management
CREATE TABLE documents (
    id TEXT PRIMARY KEY DEFAULT 'doc_' || substr(md5(random()::text), 1, 8),
    submission_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    file_hash TEXT UNIQUE NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('APPLICATION', 'CERTIFICATE', 'POLICY', 'INVOICE', 'OTHER')),
    description TEXT,
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

-- ACORD Forms
CREATE TABLE acord_forms (
    id TEXT PRIMARY KEY DEFAULT 'form_' || substr(md5(random()::text), 1, 8),
    submission_id TEXT NOT NULL,
    form_type TEXT NOT NULL,
    form_data JSONB NOT NULL,
    generated_by TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'GENERATED' CHECK (status IN ('GENERATED', 'SIGNED', 'REJECTED', 'EXPIRED')),
    signed_at TIMESTAMP WITH TIME ZONE,
    signed_by TEXT,
    file_path TEXT,
    file_hash TEXT,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

-- Field Mapping Configuration
CREATE TABLE field_mappings (
    id TEXT PRIMARY KEY DEFAULT 'mapping_' || substr(md5(random()::text), 1, 8),
    acord_form TEXT NOT NULL,
    field_name TEXT NOT NULL,
    intake_field TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('TEXT', 'TEXTAREA', 'NUMBER', 'SELECT', 'CHECKBOX', 'DATE', 'EMAIL', 'PHONE')),
    required BOOLEAN DEFAULT FALSE,
    agency_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (agency_id) REFERENCES agencies(id)
);

-- Notifications
CREATE TABLE notifications (
    id TEXT PRIMARY KEY DEFAULT 'notif_' || substr(md5(random()::text), 1, 8),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    submission_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (submission_id) REFERENCES submissions(id)
);

-- Audit Logging
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY DEFAULT 'audit_' || substr(md5(random()::text), 1, 8),
    user_id TEXT,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    submission_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (submission_id) REFERENCES submissions(id)
);

-- System Settings
CREATE TABLE system_settings (
    id TEXT PRIMARY KEY DEFAULT 'setting_' || substr(md5(random()::text), 1, 8),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_agency_id ON users(agency_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_broker_id ON submissions(broker_id);
CREATE INDEX idx_submissions_agency_id ON submissions(agency_id);
CREATE INDEX idx_documents_submission_id ON documents(submission_id);
CREATE INDEX idx_acord_forms_submission_id ON acord_forms(submission_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable Row Level Security (RLS) for multi-tenancy
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE acord_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic - you can customize these)
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid()::text = id);

-- Insert some default data
INSERT INTO agencies (id, name, domain, primary_color, accent_color) VALUES 
('agency_default', 'Default Agency', 'default.acordintake.com', '#1e3a8a', '#3b82f6');

INSERT INTO system_settings (key, value, description) VALUES 
('app_name', '"ACORD Intake Platform"', 'Application name'),
('app_version', '"1.0.0"', 'Application version'),
('maintenance_mode', 'false', 'Maintenance mode flag');
