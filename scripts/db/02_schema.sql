-- ============================================================
-- EXTENSIONES REQUERIDAS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- bÃºsqueda fuzzy

-- ============================================================
-- TIPOS ENUMERADOS
-- ============================================================
CREATE TYPE user_role AS ENUM (
    'reporter',         -- Usuario que reporta incidencias
    'agent',            -- Agente de soporte / resolutor
    'supervisor',       -- Supervisor de equipo
    'admin'             -- Administrador del sistema
);

CREATE TYPE incident_priority AS ENUM (
    'critical',         -- P1: Impacto masivo, servicio caÃ­do
    'high',             -- P2: Impacto significativo, degradaciÃ³n severa
    'medium',           -- P3: Impacto moderado, workaround disponible
    'low'               -- P4: Impacto menor, solicitud de mejora
);

CREATE TYPE incident_status AS ENUM (
    'open',             -- ReciÃ©n creada, pendiente de asignaciÃ³n
    'assigned',         -- Asignada a un agente
    'in_progress',      -- En proceso de resoluciÃ³n
    'awaiting_info',    -- Esperando informaciÃ³n del reportador
    'awaiting_vendor',  -- Esperando respuesta de proveedor externo
    'resolved',         -- Resuelta, pendiente de confirmaciÃ³n
    'closed',           -- Cerrada y confirmada
    'reopened'          -- Reabierta despuÃ©s de resoluciÃ³n
);

CREATE TYPE tracking_event_type AS ENUM (
    'created',
    'assigned',
    'status_changed',
    'priority_changed',
    'comment_added',
    'attachment_added',
    'escalated',
    'sla_warning',
    'sla_breached',
    'resolved',
    'closed',
    'reopened',
    'merged',
    'field_updated'
);

-- ============================================================
-- TABLA: users
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    role            user_role NOT NULL DEFAULT 'reporter',
    department      VARCHAR(100),
    phone           VARCHAR(20),
    avatar_url      TEXT,
    active          BOOLEAN NOT NULL DEFAULT true,
    email_verified  BOOLEAN NOT NULL DEFAULT false,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);

-- ============================================================
-- TABLA: systems (catÃ¡logo de sistemas gestionados)
-- ============================================================
CREATE TABLE systems (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),       -- ERP, CRM, Infraestructura, Red, etc.
    criticality     VARCHAR(20) NOT NULL DEFAULT 'medium',
    owner_id        UUID REFERENCES users(id),
    sla_hours       INTEGER DEFAULT 24,
    active          BOOLEAN NOT NULL DEFAULT true,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: incidents
-- ============================================================
CREATE TABLE incidents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number   VARCHAR(20) NOT NULL UNIQUE,  -- PGI-2026-000001
    title           VARCHAR(300) NOT NULL,
    description     TEXT NOT NULL,
    priority        incident_priority NOT NULL DEFAULT 'medium',
    status          incident_status NOT NULL DEFAULT 'open',
    category        VARCHAR(100),
    subcategory     VARCHAR(100),
    system_id       UUID NOT NULL REFERENCES systems(id),
    reporter_id     UUID NOT NULL REFERENCES users(id),
    assignee_id     UUID REFERENCES users(id),

    -- Control de concurrencia optimista
    version         INTEGER NOT NULL DEFAULT 1,

    -- SLA
    sla_deadline    TIMESTAMPTZ,
    sla_breached    BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps de ciclo de vida
    first_response_at TIMESTAMPTZ,
    resolved_at     TIMESTAMPTZ,
    closed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- BÃºsqueda full-text
    search_vector   TSVECTOR
);

-- Ãndices de rendimiento
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_priority ON incidents(priority);
CREATE INDEX idx_incidents_system ON incidents(system_id);
CREATE INDEX idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX idx_incidents_assignee ON incidents(assignee_id);
CREATE INDEX idx_incidents_created ON incidents(created_at DESC);
CREATE INDEX idx_incidents_sla ON incidents(sla_deadline)
    WHERE sla_breached = false AND status NOT IN ('closed', 'resolved');
CREATE INDEX idx_incidents_search ON incidents USING GIN(search_vector);
CREATE INDEX idx_incidents_ticket ON incidents(ticket_number);

-- Trigger para actualizar search_vector
CREATE OR REPLACE FUNCTION incidents_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('spanish', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('spanish', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('spanish', COALESCE(NEW.ticket_number, '')), 'A');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_incidents_search
    BEFORE INSERT OR UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION incidents_search_trigger();

-- Trigger para auto-generar ticket_number
CREATE OR REPLACE FUNCTION generate_ticket_number() RETURNS trigger AS $$
DECLARE
    seq_val INTEGER;
BEGIN
    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(ticket_number, '-', 3) AS INTEGER)
    ), 0) + 1
    INTO seq_val
    FROM incidents
    WHERE ticket_number LIKE 'PGI-' || EXTRACT(YEAR FROM NOW())::TEXT || '-%';

    NEW.ticket_number := 'PGI-' ||
        EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
        LPAD(seq_val::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_ticket_number
    BEFORE INSERT ON incidents
    FOR EACH ROW
    WHEN (NEW.ticket_number IS NULL)
    EXECUTE FUNCTION generate_ticket_number();

-- ============================================================
-- TABLA: tracking_events (Event Sourcing para auditorÃ­a)
-- ============================================================
CREATE TABLE tracking_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    actor_id        UUID NOT NULL REFERENCES users(id),
    event_type      tracking_event_type NOT NULL,
    field_changed   VARCHAR(100),
    old_value       TEXT,
    new_value       TEXT,
    comment         TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INMUTABLE: No se permite UPDATE ni DELETE en tracking
CREATE INDEX idx_tracking_incident ON tracking_events(incident_id, created_at);
CREATE INDEX idx_tracking_actor ON tracking_events(actor_id);
CREATE INDEX idx_tracking_type ON tracking_events(event_type);

-- ============================================================
-- TABLA: incident_comments
-- ============================================================
CREATE TABLE incident_comments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    author_id       UUID NOT NULL REFERENCES users(id),
    body            TEXT NOT NULL,
    is_internal     BOOLEAN NOT NULL DEFAULT false,  -- Solo visible para agentes
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_incident ON incident_comments(incident_id, created_at);

-- ============================================================
-- TABLA: attachments
-- ============================================================
CREATE TABLE attachments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id     UUID REFERENCES incidents(id) ON DELETE CASCADE,
    comment_id      UUID REFERENCES incident_comments(id) ON DELETE CASCADE,
    uploaded_by     UUID NOT NULL REFERENCES users(id),
    file_name       VARCHAR(255) NOT NULL,
    file_path       TEXT NOT NULL,
    file_size       BIGINT NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    checksum_sha256 VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_attachment_parent
        CHECK (incident_id IS NOT NULL OR comment_id IS NOT NULL)
);

CREATE INDEX idx_attachments_incident ON attachments(incident_id);

-- ============================================================
-- TABLA: email_log
-- ============================================================
CREATE TABLE email_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id     UUID REFERENCES incidents(id),
    recipient       VARCHAR(255) NOT NULL,
    subject         VARCHAR(500) NOT NULL,
    template_used   VARCHAR(100),
    status          VARCHAR(20) NOT NULL DEFAULT 'queued',
    error_message   TEXT,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: sla_definitions
-- ============================================================
CREATE TABLE sla_definitions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    system_id           UUID REFERENCES systems(id),
    priority            incident_priority NOT NULL,
    response_hours      INTEGER NOT NULL,
    resolution_hours    INTEGER NOT NULL,
    escalation_hours    INTEGER NOT NULL,
    active              BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(system_id, priority)
);

-- ============================================================
-- TABLA: notification_preferences
-- ============================================================
CREATE TABLE notification_preferences (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    channel         VARCHAR(20) NOT NULL,  -- 'email', 'web', 'both'
    event_type      tracking_event_type NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, channel, event_type)
);
