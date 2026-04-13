# 🛡️ PGI — Plataforma de Gestión de Incidencias

> **Sistema integral de gestión, seguimiento y resolución de incidencias para equipos de soporte TI**
> Versión 2.0 · Documento de Especificación Técnica y Funcional

---

## 📋 Tabla de Contenidos

1. [Visión General del Proyecto](#1-visión-general-del-proyecto)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Modelo de Datos (PostgreSQL)](#3-modelo-de-datos-postgresql)
4. [Módulos Funcionales](#4-módulos-funcionales)
5. [Gestión de Usuarios y Roles](#5-gestión-de-usuarios-y-roles)
6. [Sistema de Tracking de Incidencias](#6-sistema-de-tracking-de-incidencias)
7. [Sistema de Notificaciones y Correos](#7-sistema-de-notificaciones-y-correos)
8. [Interfaz de Usuario — Portal de Reportes](#8-interfaz-de-usuario--portal-de-reportes)
9. [Interfaz de Administración — Panel de Agentes](#9-interfaz-de-administración--panel-de-agentes)
10. [Gestión de Evidencias y Adjuntos](#10-gestión-de-evidencias-y-adjuntos)
11. [Motor de Reportería y Analítica](#11-motor-de-reportería-y-analítica)
12. [Concurrencia y Manejo de Conflictos](#12-concurrencia-y-manejo-de-conflictos)
13. [Colaboración en Tiempo Real](#13-colaboración-en-tiempo-real)
14. [Catálogo de Sistemas Gestionados](#14-catálogo-de-sistemas-gestionados)
15. [Seguridad y Auditoría](#15-seguridad-y-auditoría)
16. [Stack Tecnológico](#16-stack-tecnológico)
17. [Wireframes Completos](#17-wireframes-completos)
18. [Historias de Usuario](#18-historias-de-usuario)
19. [Plan de Despliegue](#19-plan-de-despliegue)
20. [Roadmap](#20-roadmap)

---

## 1. Visión General del Proyecto

### 1.1 Propósito

**PGI (Plataforma de Gestión de Incidencias)** es una plataforma web robusta y colaborativa diseñada para centralizar la gestión completa del ciclo de vida de incidencias en infraestructura TI. Permite a los usuarios finales reportar problemas de forma sencilla, adjuntar evidencia, y dar seguimiento en tiempo real; mientras que los equipos de soporte disponen de herramientas avanzadas para clasificar, asignar, resolver y documentar cada incidente con trazabilidad completa.

### 1.2 Objetivos Estratégicos

| Objetivo | Descripción |
|----------|-------------|
| **Centralización** | Punto único de entrada para todas las incidencias de todos los sistemas gestionados |
| **Trazabilidad total** | Tracking granular desde la apertura hasta el cierre con bitácora inmutable |
| **Colaboración** | Ambiente web colaborativo en tiempo real sin solapamiento de acciones |
| **Reportería avanzada** | Generación de reportes de alto valor para la toma de decisiones |
| **Usabilidad** | Interfaces diferenciadas y optimizadas para cada tipo de usuario |
| **Robustez** | Concurrencia segura, integridad de datos, alta disponibilidad |

### 1.3 Alcance

```
┌─────────────────────────────────────────────────────────────────┐
│                            PGI                                   │
│              Plataforma de Gestión de Incidencias               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Portal de   │  │   Panel de   │  │  Motor de Reportería  │  │
│  │  Usuarios    │  │   Agentes    │  │  y Analítica          │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘  │
│         │                 │                      │              │
│  ┌──────┴─────────────────┴──────────────────────┴───────────┐  │
│  │              Core de Gestión de Incidencias                │  │
│  │  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌────────────────┐  │  │
│  │  │Tracking │ │ Correos  │ │Evidencia│ │  Concurrencia  │  │  │
│  │  └─────────┘ └──────────┘ └─────────┘ └────────────────┘  │  │
│  └────────────────────────────┬───────────────────────────────┘  │
│                               │                                 │
│  ┌────────────────────────────┴───────────────────────────────┐  │
│  │                    PostgreSQL Database                      │  │
│  │   Usuarios · Incidencias · Tracking · Adjuntos · Sistemas  │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Arquitectura del Sistema

### 2.1 Arquitectura de Alto Nivel

```
                        ┌─────────────────┐
                        │   Load Balancer  │
                        │  (Nginx/HAProxy) │
                        └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
            ┌───────┴───────┐         ┌───────┴───────┐
            │  Frontend SPA │         │  Frontend SPA │
            │  (Instancia 1)│         │  (Instancia 2)│
            └───────┬───────┘         └───────┬───────┘
                    │                         │
                    └────────────┬────────────┘
                                │
                    ┌───────────┴───────────┐
                    │    API Gateway         │
                    │    Rate Limiting       │
                    │    Auth Middleware     │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
     ┌────────┴──────┐  ┌──────┴───────┐  ┌──────┴──────┐
     │  Servicio de  │  │  Servicio de │  │  Servicio   │
     │  Incidencias  │  │  Usuarios    │  │  de Correo  │
     └────────┬──────┘  └──────┬───────┘  └──────┬──────┘
              │                │                 │
              └────────────────┼─────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   PostgreSQL 16+    │
                    │   Primary           │
                    │   ┌──────────────┐  │
                    │   │  Read Replica │  │
                    │   └──────────────┘  │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │   Redis (Cache +    │
                    │   Pub/Sub + Colas)  │
                    └─────────────────────┘
```

### 2.2 Patrones Arquitectónicos

| Patrón | Aplicación |
|--------|-----------|
| **MVC / Clean Architecture** | Separación estricta de responsabilidades en el backend |
| **Repository Pattern** | Capa de abstracción sobre PostgreSQL para queries complejos |
| **Event Sourcing** | El tracking de incidencias se modela como secuencia de eventos inmutables |
| **Optimistic Locking** | Control de concurrencia para edición simultánea de tickets |
| **CQRS (simplificado)** | Separación de lectura (reportes/dashboards) y escritura (operaciones) |
| **Observer/Pub-Sub** | Notificaciones en tiempo real vía WebSockets + Redis Pub/Sub |

### 2.3 Requisitos No Funcionales

| Requisito | Métrica |
|-----------|---------|
| **Disponibilidad** | ≥ 99.5% uptime mensual |
| **Tiempo de respuesta** | < 500ms para operaciones CRUD, < 3s para reportes complejos |
| **Concurrencia** | Soporte mínimo de 200 usuarios simultáneos |
| **Almacenamiento** | Adjuntos hasta 25MB por archivo, sin límite por incidencia |
| **Retención** | Datos de incidencias retenidos mínimo 5 años |
| **Backup** | RPO: 1 hora · RTO: 4 horas |

---

## 3. Modelo de Datos (PostgreSQL)

### 3.1 Diagrama Entidad-Relación

```
┌──────────────────┐       ┌──────────────────────┐       ┌──────────────────┐
│    users          │       │    incidents          │       │    systems       │
├──────────────────┤       ├──────────────────────┤       ├──────────────────┤
│ id (PK, UUID)    │──┐    │ id (PK, UUID)        │    ┌──│ id (PK, UUID)    │
│ email (UNIQUE)   │  │    │ ticket_number (UNIQ) │    │  │ name             │
│ password_hash    │  │    │ title                │    │  │ description      │
│ first_name       │  ├───>│ description          │    │  │ category         │
│ last_name        │  │    │ priority             │    │  │ criticality      │
│ role             │  │    │ status               │    │  │ owner_id (FK)    │
│ department       │  │    │ category             │    │  │ sla_hours        │
│ phone            │  │    │ system_id (FK)───────│────┘  │ active           │
│ avatar_url       │  │    │ reporter_id (FK)─────│──┘    │ created_at       │
│ active           │  │    │ assignee_id (FK)─────│──┘    │ updated_at       │
│ email_verified   │  │    │ version (LOCK)       │       └──────────────────┘
│ last_login       │  │    │ sla_deadline         │
│ created_at       │  │    │ resolved_at          │       ┌──────────────────┐
│ updated_at       │  │    │ closed_at            │       │   attachments    │
└──────────────────┘  │    │ created_at           │       ├──────────────────┤
                      │    │ updated_at           │    ┌──│ id (PK, UUID)    │
┌──────────────────┐  │    └──────────┬───────────┘    │  │ incident_id (FK) │
│  tracking_events │  │               │                │  │ uploaded_by (FK) │
├──────────────────┤  │               │                │  │ file_name        │
│ id (PK, UUID)    │  │               │                │  │ file_path        │
│ incident_id (FK)─│──┼───────────────┘                │  │ file_size        │
│ actor_id (FK)────│──┘                                │  │ mime_type        │
│ event_type       │       ┌──────────────────────┐    │  │ checksum_sha256  │
│ field_changed    │       │   incident_comments  │    │  │ created_at       │
│ old_value        │       ├──────────────────────┤    │  └──────────────────┘
│ new_value        │       │ id (PK, UUID)        │    │
│ comment          │       │ incident_id (FK)─────│────┘
│ metadata (JSONB) │       │ author_id (FK)       │       ┌──────────────────┐
│ created_at       │       │ body                 │       │  email_log       │
└──────────────────┘       │ is_internal          │       ├──────────────────┤
                           │ attachments (FK[])   │       │ id (PK, UUID)    │
                           │ created_at           │       │ incident_id (FK) │
                           │ updated_at           │       │ recipient        │
                           └──────────────────────┘       │ subject          │
                                                          │ template_used    │
┌──────────────────┐       ┌──────────────────────┐       │ status           │
│  sla_definitions │       │  notification_prefs  │       │ sent_at          │
├──────────────────┤       ├──────────────────────┤       │ error_message    │
│ id (PK, UUID)    │       │ id (PK, UUID)        │       │ created_at       │
│ system_id (FK)   │       │ user_id (FK)         │       └──────────────────┘
│ priority         │       │ channel              │
│ response_hours   │       │ event_type           │
│ resolution_hours │       │ enabled              │
│ escalation_hours │       │ created_at           │
│ active           │       └──────────────────────┘
└──────────────────┘
```

### 3.2 Definiciones SQL Clave

```sql
-- ============================================================
-- EXTENSIONES REQUERIDAS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- búsqueda fuzzy

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
    'critical',         -- P1: Impacto masivo, servicio caído
    'high',             -- P2: Impacto significativo, degradación severa
    'medium',           -- P3: Impacto moderado, workaround disponible
    'low'               -- P4: Impacto menor, solicitud de mejora
);

CREATE TYPE incident_status AS ENUM (
    'open',             -- Recién creada, pendiente de asignación
    'assigned',         -- Asignada a un agente
    'in_progress',      -- En proceso de resolución
    'awaiting_info',    -- Esperando información del reportador
    'awaiting_vendor',  -- Esperando respuesta de proveedor externo
    'resolved',         -- Resuelta, pendiente de confirmación
    'closed',           -- Cerrada y confirmada
    'reopened'          -- Reabierta después de resolución
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
-- TABLA: systems (catálogo de sistemas gestionados)
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

    -- Búsqueda full-text
    search_vector   TSVECTOR
);

-- Índices de rendimiento
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
-- TABLA: tracking_events (Event Sourcing para auditoría)
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
```

### 3.3 Procedimiento de Concurrencia Optimista

```sql
-- Actualización segura con control de versión
CREATE OR REPLACE FUNCTION update_incident_safe(
    p_incident_id UUID,
    p_expected_version INTEGER,
    p_changes JSONB,
    p_actor_id UUID
) RETURNS TABLE(success BOOLEAN, current_version INTEGER, message TEXT) AS $$
DECLARE
    v_current_version INTEGER;
BEGIN
    -- Bloqueo a nivel de fila (FOR UPDATE)
    SELECT version INTO v_current_version
    FROM incidents
    WHERE id = p_incident_id
    FOR UPDATE;

    IF v_current_version IS NULL THEN
        RETURN QUERY SELECT false, 0, 'Incidencia no encontrada';
        RETURN;
    END IF;

    IF v_current_version != p_expected_version THEN
        RETURN QUERY SELECT false, v_current_version,
            'Conflicto de versión: otro usuario modificó este ticket. '
            || 'Versión esperada: ' || p_expected_version::TEXT
            || ', Versión actual: ' || v_current_version::TEXT;
        RETURN;
    END IF;

    -- Aplicar cambios dinámicamente
    UPDATE incidents
    SET version = version + 1,
        updated_at = NOW(),
        status = COALESCE((p_changes->>'status')::incident_status, status),
        priority = COALESCE((p_changes->>'priority')::incident_priority, priority),
        assignee_id = COALESCE((p_changes->>'assignee_id')::UUID, assignee_id),
        title = COALESCE(p_changes->>'title', title),
        description = COALESCE(p_changes->>'description', description)
    WHERE id = p_incident_id;

    -- Registrar evento de tracking
    INSERT INTO tracking_events (incident_id, actor_id, event_type, metadata)
    VALUES (p_incident_id, p_actor_id, 'field_updated', p_changes);

    RETURN QUERY SELECT true, v_current_version + 1, 'Actualización exitosa';
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Módulos Funcionales

### 4.1 Mapa de Módulos

```
PGI — PLATAFORMA DE GESTIÓN DE INCIDENCIAS
│
├── 🎫 Gestión de Incidencias (Core)
│   ├── Creación y clasificación
│   ├── Asignación manual y automática
│   ├── Flujo de estados con validación
│   ├── Merge de incidencias duplicadas
│   └── Plantillas de incidencias recurrentes
│
├── 📍 Tracking y Auditoría
│   ├── Timeline de eventos inmutable
│   ├── Bitácora de cambios campo a campo
│   ├── Historial de asignaciones
│   └── Registro de tiempos por fase
│
├── 👥 Gestión de Usuarios
│   ├── CRUD de usuarios con roles
│   ├── Autenticación JWT + Refresh Tokens
│   ├── Directorio de agentes por especialidad
│   └── Preferencias y notificaciones
│
├── 🖥️ Catálogo de Sistemas
│   ├── Registro de sistemas gestionados
│   ├── Definición de SLAs por sistema/prioridad
│   ├── Asignación de responsables
│   └── Métricas de salud por sistema
│
├── 📎 Gestión de Evidencias
│   ├── Upload drag & drop múltiple
│   ├── Preview de imágenes y PDFs
│   ├── Almacenamiento seguro con hash de integridad
│   └── Vinculación a incidencia o comentario
│
├── ✉️ Motor de Correos
│   ├── Notificaciones automáticas por evento
│   ├── Templates personalizables (Handlebars)
│   ├── Cola de envío con reintentos
│   └── Log de correos enviados
│
├── 📊 Reportería y Analítica
│   ├── Dashboard en tiempo real
│   ├── Reportes prediseñados (PDF/Excel)
│   ├── KPIs de SLA y rendimiento
│   ├── Reportes ad-hoc con filtros avanzados
│   └── Exportación programada
│
└── 🔄 Colaboración en Tiempo Real
    ├── WebSocket para actualizaciones live
    ├── Indicadores de "usuario editando"
    ├── Comentarios en tiempo real
    └── Notificaciones push en navegador
```

---

## 5. Gestión de Usuarios y Roles

### 5.1 Matriz de Roles y Permisos

| Permiso | Reporter | Agent | Supervisor | Admin |
|---------|:--------:|:-----:|:----------:|:-----:|
| Crear incidencia | ✅ | ✅ | ✅ | ✅ |
| Ver incidencias propias | ✅ | ✅ | ✅ | ✅ |
| Ver todas las incidencias | ❌ | ✅ | ✅ | ✅ |
| Comentar (público) | ✅ | ✅ | ✅ | ✅ |
| Comentar (interno) | ❌ | ✅ | ✅ | ✅ |
| Adjuntar evidencia | ✅ | ✅ | ✅ | ✅ |
| Cambiar estado | ❌ | ✅ | ✅ | ✅ |
| Cambiar prioridad | ❌ | ✅ | ✅ | ✅ |
| Asignar agente | ❌ | ⚠️ Propio | ✅ | ✅ |
| Reasignar incidencia | ❌ | ❌ | ✅ | ✅ |
| Cerrar incidencia | ❌ | ✅ | ✅ | ✅ |
| Reabrir incidencia | ✅ Propia | ✅ | ✅ | ✅ |
| Ver reportes básicos | ❌ | ✅ | ✅ | ✅ |
| Ver reportes avanzados | ❌ | ❌ | ✅ | ✅ |
| Exportar reportes | ❌ | ❌ | ✅ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ❌ | ✅ |
| Gestionar sistemas | ❌ | ❌ | ✅ | ✅ |
| Configurar SLAs | ❌ | ❌ | ❌ | ✅ |
| Ver log de auditoría | ❌ | ❌ | ✅ | ✅ |

### 5.2 Flujo de Autenticación

```
┌─────────┐    POST /auth/login     ┌─────────────┐
│ Usuario │ ──────────────────────> │   Backend    │
│         │ <────────────────────── │              │
│         │   { access_token,       │  Valida      │
│         │     refresh_token }     │  credenciales│
└────┬────┘                         └──────┬──────┘
     │                                     │
     │  Cada request:                      │
     │  Authorization: Bearer <token>      │
     │                                     │
     │  Cuando access_token expira:        │
     │  POST /auth/refresh                 │
     │  { refresh_token }                  │
     │  → Nuevo par de tokens              │
     └─────────────────────────────────────┘

Access Token:  Vida útil de 15 minutos
Refresh Token: Vida útil de 7 días (rotación en cada uso)
```

---

## 6. Sistema de Tracking de Incidencias

### 6.1 Máquina de Estados

```
                    ┌──────────────────────────────────────────────┐
                    │                                              │
                    ▼                                              │
             ┌───────────┐     Asignar      ┌────────────┐        │
 Crear ────> │   OPEN    │ ───────────────> │  ASSIGNED   │        │
             └─────┬─────┘                  └──────┬─────┘        │
                   │                               │              │
                   │         Iniciar trabajo       │              │
                   │                               ▼              │
                   │                        ┌─────────────┐       │
                   │                        │ IN_PROGRESS  │ <────┤
                   │                        └──────┬──────┘       │
                   │                               │              │
                   │              ┌────────────────┼──────────┐   │
                   │              │                │           │   │
                   │              ▼                ▼           │   │
                   │     ┌──────────────┐  ┌────────────┐     │   │
                   │     │AWAITING_INFO │  │ AWAITING_  │     │   │
                   │     │              │  │ VENDOR     │     │   │
                   │     └──────┬───────┘  └─────┬──────┘     │   │
                   │            │                │            │   │
                   │            └────────┬───────┘            │   │
                   │                     │ Info recibida      │   │
                   │                     ▼                    │   │
                   │              ┌─────────────┐             │   │
                   │              │ IN_PROGRESS  │             │   │
                   │              └──────┬──────┘             │   │
                   │                     │                    │   │
                   │                     │ Resolver           │   │
                   │                     ▼                    │   │
                   │              ┌─────────────┐             │   │
                   │              │  RESOLVED    │             │   │
                   │              └──────┬──────┘             │   │
                   │                     │                    │   │
                   │          ┌──────────┼──────────┐         │   │
                   │          │ Confirmar│          │Reabrir  │   │
                   │          ▼          │          ▼         │   │
                   │   ┌───────────┐     │   ┌───────────┐   │   │
                   │   │  CLOSED   │     │   │ REOPENED   │───┘   │
                   │   └───────────┘     │   └───────────┘        │
                   │                     │                        │
                   └─────────────────────┴────────────────────────┘
```

### 6.2 Reglas de Transición de Estado

| Estado Actual | Estados Permitidos | Quién Puede | Validaciones |
|---------------|-------------------|-------------|-------------|
| `open` | `assigned` | Agent, Supervisor, Admin | Debe especificar `assignee_id` |
| `assigned` | `in_progress`, `open` | Agente asignado, Supervisor | — |
| `in_progress` | `awaiting_info`, `awaiting_vendor`, `resolved` | Agente asignado | Si `resolved`, requiere comentario de resolución |
| `awaiting_info` | `in_progress` | Reporter (al responder), Agente | — |
| `awaiting_vendor` | `in_progress` | Agente asignado | — |
| `resolved` | `closed`, `reopened` | Reporter (confirma), Agente, Auto-cierre a 5 días | — |
| `reopened` | `in_progress` | Agente asignado | Requiere comentario de razón |
| `closed` | `reopened` | Supervisor, Admin | Solo dentro de 30 días desde cierre |

### 6.3 Estructura del Timeline de Tracking

Cada evento en el tracking genera un registro inmutable:

```json
{
    "id": "evt-uuid-001",
    "incident_id": "inc-uuid-123",
    "actor": {
        "id": "usr-uuid-456",
        "name": "María García",
        "role": "agent",
        "avatar": "/avatars/maria.jpg"
    },
    "event_type": "status_changed",
    "field_changed": "status",
    "old_value": "assigned",
    "new_value": "in_progress",
    "comment": "Inicio de diagnóstico. Se identificó problema en el servicio de autenticación.",
    "metadata": {
        "ip_address": "192.168.1.50",
        "user_agent": "Mozilla/5.0...",
        "session_id": "sess-789"
    },
    "created_at": "2026-04-13T14:30:00Z"
}
```

---

## 7. Sistema de Notificaciones y Correos

### 7.1 Matriz de Notificaciones por Evento

| Evento | Reporter | Agente Asignado | Supervisor | CC/Watchers |
|--------|:--------:|:---------------:|:----------:|:-----------:|
| Incidencia creada | ✅ Confirmación | ✅ Si auto-asignado | ✅ Si P1/P2 | — |
| Asignada | ✅ | ✅ Notificación de asignación | — | — |
| Cambio de estado | ✅ | ✅ | ✅ Si escalada | ✅ |
| Nuevo comentario público | ✅ | ✅ | — | ✅ |
| Nuevo comentario interno | — | ✅ | ✅ | — |
| SLA próximo a vencer (80%) | — | ✅ Alerta | ✅ Alerta | — |
| SLA incumplido | ✅ | ✅ Alerta crítica | ✅ Escalación | ✅ Admin |
| Resolución | ✅ Pedir confirmación | — | — | ✅ |
| Cierre | ✅ Encuesta satisfacción | ✅ | — | — |
| Reapertura | — | ✅ | ✅ | — |

### 7.2 Arquitectura del Motor de Correos

```
┌──────────────┐     Evento     ┌──────────────────┐
│  Incidencia  │ ─────────────> │  Event Dispatcher │
│  (cambio)    │                │                   │
└──────────────┘                └────────┬──────────┘
                                         │
                                         ▼
                                ┌──────────────────┐
                                │  Notification     │
                                │  Rule Engine      │
                                │  (¿A quién?)      │
                                └────────┬──────────┘
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                       ┌──────┴──────┐      ┌───────┴──────┐
                       │  WebSocket  │      │  Email Queue │
                       │  (Push Web) │      │  (Redis Bull)│
                       └─────────────┘      └───────┬──────┘
                                                    │
                                            ┌───────┴──────┐
                                            │  Email Worker │
                                            │              │
                                            │ 1. Load      │
                                            │    template  │
                                            │ 2. Render    │
                                            │    (Hndlbrs) │
                                            │ 3. Send via  │
                                            │    SMTP      │
                                            │ 4. Log       │
                                            │    result    │
                                            └──────────────┘
```

### 7.3 Templates de Correo

| Template | Trigger | Contenido |
|----------|---------|-----------|
| `incident_created` | Nueva incidencia | Número de ticket, resumen, enlace directo |
| `incident_assigned` | Asignación | Datos del ticket, agente asignado, SLA |
| `status_update` | Cambio de estado | Estado anterior → nuevo, comentario |
| `new_comment` | Comentario público | Autor, extracto, enlace al ticket |
| `sla_warning` | SLA al 80% | Tiempo restante, datos del ticket, acción requerida |
| `sla_breach` | SLA incumplido | Detalle de incumplimiento, cadena de escalación |
| `resolution_confirm` | Incidencia resuelta | Resumen de resolución, botón de confirmar/reabrir |
| `satisfaction_survey` | Cierre confirmado | Encuesta de 5 estrellas + comentario libre |
| `weekly_digest` | Programado (lunes) | Resumen semanal de tickets para supervisores |

---

## 8. Interfaz de Usuario — Portal de Reportes

> **Público objetivo:** Usuarios finales que reportan incidencias y dan seguimiento.

### 8.1 Pantallas del Portal

```
PORTAL DE USUARIOS
│
├── 🔐 Login / Registro
├── 🏠 Home / Dashboard Personal
├── ➕ Crear Incidencia (Wizard 4 pasos)
├── 📋 Mis Incidencias (Lista)
├── 🔍 Detalle de Incidencia + Timeline
├── 📎 Gestión de Adjuntos
├── ✅ Confirmar Resolución / Reabrir
├── ⭐ Encuesta de Satisfacción
├── 🔔 Centro de Notificaciones
└── ⚙️ Mi Perfil / Preferencias
```

---

## 9. Interfaz de Administración — Panel de Agentes

> **Público objetivo:** Agentes de soporte, supervisores y administradores.

### 9.1 Pantallas del Panel de Agentes

```
PANEL DE AGENTES / ADMINISTRACIÓN
│
├── 📊 Dashboard Operativo
├── 📋 Cola de Incidencias (Tabla avanzada)
├── 🔍 Detalle de Incidencia (Vista Agente)
├── 💬 Comentarios Internos / Públicos
├── 📎 Gestión de Evidencias Avanzada
├── ⚡ Panel de Escalación
├── 👥 Gestión de Equipo (Supervisor+)
├── 🖥️ Gestión de Sistemas (Supervisor+)
├── ⏱️ Configuración de SLAs (Admin)
├── 📊 Reportería y Analítica
│   ├── Constructor de Reportes
│   ├── Reportes Prediseñados
│   └── Programación de Envío
├── 👤 Gestión de Usuarios (Admin)
├── 📧 Configuración de Plantillas de Correo (Admin)
├── 📜 Log de Auditoría (Supervisor+)
└── ⚙️ Configuración Global (Admin)
```

---

## 10. Gestión de Evidencias y Adjuntos

### 10.1 Especificaciones Técnicas

| Aspecto | Detalle |
|---------|---------|
| **Almacenamiento** | Object Storage (MinIO / S3-compatible) |
| **Límite por archivo** | 25 MB |
| **Formatos permitidos** | Imágenes (PNG, JPG, GIF, WebP), Documentos (PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, LOG), Video (MP4, WebM ≤ 25MB), Comprimidos (ZIP, RAR) |
| **Integridad** | SHA-256 hash calculado al upload y verificado al download |
| **Seguridad** | URLs firmadas con expiración de 1 hora; no acceso directo |
| **Antivirus** | Scan con ClamAV antes de aceptar el archivo |
| **Thumbnails** | Generación automática para imágenes (150x150) |
| **Clipboard** | Soporte nativo `paste` para screenshots directos |

---

## 11. Motor de Reportería y Analítica

### 11.1 Reportes Prediseñados

| # | Reporte | Audiencia | Frecuencia | Formato |
|---|---------|-----------|-----------|---------|
| R01 | **Resumen Ejecutivo de Operaciones** | Dirección | Mensual | PDF |
| | Tickets abiertos/cerrados, SLA global, tendencias, top 5 sistemas problemáticos | | | |
| R02 | **Dashboard de SLA Compliance** | Supervisores | Diario | Web / PDF |
| | % cumplimiento por sistema, por prioridad, por agente. Detalle de breaches | | | |
| R03 | **Productividad por Agente** | Supervisores | Semanal | Excel / PDF |
| | Tickets asignados, resueltos, tiempo promedio, distribución por prioridad | | | |
| R04 | **Análisis de Incidencias por Sistema** | Gestores TI | Mensual | PDF |
| | Volumetría, recurrencia, categorías más frecuentes, tiempo de resolución | | | |
| R05 | **Reporte de Tendencias** | Dirección | Trimestral | PDF |
| | Comparativa periodos, proyecciones, análisis de causa raíz, recomendaciones | | | |
| R06 | **Satisfacción del Usuario** | Supervisores | Mensual | PDF |
| | Resultados de encuestas, NPS, comentarios, comparativa por sistema | | | |
| R07 | **Aging Report** | Agentes | Diario | Web |
| | Tickets abiertos por antigüedad (< 24h, 1-3 días, 3-7 días, > 7 días) | | | |
| R08 | **Reporte de Escalaciones** | Supervisores | Semanal | PDF |
| | Tickets escalados, razones, tiempo de resolución post-escalación | | | |

### 11.2 KPIs Principales

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          KPIs PGI                                       │
│                                                                         │
│  VOLUMEN                          EFICIENCIA                            │
│  ────────                         ──────────                            │
│  • Tickets creados / período      • MTTR (Mean Time To Resolve)        │
│  • Tickets cerrados / período     • MTTA (Mean Time To Assign)         │
│  • Backlog actual                 • First Contact Resolution Rate      │
│  • Tickets por sistema            • Reopen Rate                         │
│  • Tickets por categoría          • Tickets resueltos / agente / día   │
│                                                                         │
│  SLA                              SATISFACCIÓN                          │
│  ───                              ────────────                          │
│  • % SLA cumplido (global)        • CSAT Score (1-5)                   │
│  • % SLA por prioridad            • NPS (Net Promoter Score)           │
│  • % SLA por sistema              • % tickets con encuesta respondida  │
│  • Tiempo promedio de respuesta   • Comentarios negativos              │
│  • Tickets con SLA vencido        • Tendencia de satisfacción          │
│                                                                         │
│  TENDENCIAS                       CARGA                                 │
│  ──────────                       ─────                                 │
│  • Crecimiento mensual            • Tickets por agente                 │
│  • Top 5 causas recurrentes       • Distribución por turno             │
│  • Estacionalidad                 • Picos de demanda por hora/día      │
│  • Ratio creación vs resolución   • Balance de carga entre agentes     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 11.3 Queries de Reportería (Ejemplos)

```sql
-- R01: Resumen ejecutivo mensual
WITH monthly_stats AS (
    SELECT
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) AS created,
        COUNT(*) FILTER (WHERE closed_at >= DATE_TRUNC('month', NOW())) AS closed,
        COUNT(*) FILTER (WHERE status NOT IN ('closed', 'resolved')) AS backlog,
        ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)
            FILTER (WHERE resolved_at IS NOT NULL
            AND resolved_at >= DATE_TRUNC('month', NOW())), 2) AS avg_resolution_hours,
        ROUND(
            COUNT(*) FILTER (
                WHERE sla_breached = false
                AND closed_at >= DATE_TRUNC('month', NOW())
            )::DECIMAL /
            NULLIF(COUNT(*) FILTER (
                WHERE closed_at >= DATE_TRUNC('month', NOW())
            ), 0) * 100, 1
        ) AS sla_compliance_pct
    FROM incidents
)
SELECT * FROM monthly_stats;

-- R02: SLA compliance desglosado
SELECT
    s.name AS sistema,
    i.priority,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE NOT i.sla_breached) AS dentro_sla,
    ROUND(
        COUNT(*) FILTER (WHERE NOT i.sla_breached)::DECIMAL /
        NULLIF(COUNT(*), 0) * 100, 1
    ) AS pct_cumplimiento
FROM incidents i
JOIN systems s ON s.id = i.system_id
WHERE i.closed_at >= DATE_TRUNC('month', NOW())
GROUP BY s.name, i.priority
ORDER BY s.name, i.priority;

-- R07: Aging report
SELECT
    CASE
        WHEN NOW() - created_at < INTERVAL '24 hours' THEN '< 24 horas'
        WHEN NOW() - created_at < INTERVAL '3 days' THEN '1-3 días'
        WHEN NOW() - created_at < INTERVAL '7 days' THEN '3-7 días'
        ELSE '> 7 días'
    END AS rango_antiguedad,
    COUNT(*) AS cantidad,
    ARRAY_AGG(ticket_number ORDER BY created_at) AS tickets
FROM incidents
WHERE status NOT IN ('closed', 'resolved')
GROUP BY 1
ORDER BY 1;
```

---

## 12. Concurrencia y Manejo de Conflictos

### 12.1 Estrategia de Concurrencia Optimista

El sistema implementa **Optimistic Locking** basado en un campo `version` en la tabla `incidents`. Esto garantiza que dos agentes no puedan sobrescribir los cambios del otro sin ser notificados.

```
┌──────────────────────────────────────────────────────────────────────┐
│  FLUJO DE CONCURRENCIA OPTIMISTA                                     │
│                                                                      │
│  Agente A                    Servidor                 Agente B       │
│  ─────────                   ─────────                ─────────      │
│                                                                      │
│  GET /incidents/123  ────>                                           │
│  (recibe version=5)  <────  { version: 5, ... }                     │
│                                                                      │
│                                              GET /incidents/123 ──>  │
│                              { version: 5, ... }  <──────────────    │
│                                                                      │
│  PUT /incidents/123  ────>                                           │
│  { version: 5,              Verifica version=5 ✅                    │
│    status: "in_progress" }  Actualiza a version=6                    │
│  Éxito (version=6)   <────  { version: 6, ... }                     │
│                                                                      │
│                                              PUT /incidents/123 ──>  │
│                              Verifica version=5 ❌                    │
│                              (actual es 6)                            │
│                              ──────────> 409 Conflict                │
│                                                                      │
│                                              Muestra diálogo:        │
│                                              "Carlos cambió el       │
│                                               estado a En Progreso.  │
│                                               ¿Deseas recargar?"    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 13. Colaboración en Tiempo Real

### 13.1 Arquitectura WebSocket

```
┌────────────┐     ┌────────────┐     ┌──────────────┐
│ Browser A  │◄────┤            │     │              │
│ (Agente 1) │     │  WebSocket │◄───►│  Redis       │
│            │────►│  Gateway   │     │  Pub/Sub     │
└────────────┘     │  (Socket.io)│     │              │
                   │            │     │  Channels:   │
┌────────────┐     │            │     │  incident:*  │
│ Browser B  │◄────┤            │     │  dashboard   │
│ (Agente 2) │     │            │     │  user:*      │
│            │────►│            │     │              │
└────────────┘     └────────────┘     └──────────────┘
```

### 13.2 Eventos en Tiempo Real

| Canal | Evento | Payload | Suscriptores |
|-------|--------|---------|-------------|
| `incident:{id}` | `update` | Campos cambiados + nueva versión | Todos viendo el ticket |
| `incident:{id}` | `comment` | Nuevo comentario | Todos viendo el ticket |
| `incident:{id}` | `editing` | Usuario editando / dejó de editar | Todos viendo el ticket |
| `incident:{id}` | `typing` | Indicador de "escribiendo..." | Todos viendo el ticket |
| `dashboard` | `stats_update` | KPIs actualizados | Dashboard abierto |
| `dashboard` | `new_incident` | Resumen de nueva incidencia | Dashboard abierto |
| `user:{id}` | `notification` | Notificación personal | Usuario específico |
| `user:{id}` | `assignment` | Ticket asignado | Agente específico |
| `queue` | `refresh` | Señal de recarga de cola | Agentes en vista de cola |

---

## 14. Catálogo de Sistemas Gestionados

### 14.1 Estructura del Catálogo

```
CATÁLOGO DE SISTEMAS
│
├── 🏢 ERP
│   ├── SAP S/4HANA (Producción)     — Criticidad: ALTA
│   ├── SAP S/4HANA (QA)             — Criticidad: MEDIA
│   └── SAP BW (Reportería)          — Criticidad: MEDIA
│
├── 📧 Comunicaciones
│   ├── Microsoft Exchange Online     — Criticidad: ALTA
│   ├── Microsoft Teams               — Criticidad: ALTA
│   └── Cisco Unified Communications  — Criticidad: MEDIA
│
├── 🌐 Web & Aplicaciones
│   ├── Portal Web Corporativo        — Criticidad: ALTA
│   ├── Intranet SharePoint           — Criticidad: MEDIA
│   └── App Móvil de Ventas           — Criticidad: MEDIA
│
├── 🗄️ Bases de Datos
│   ├── PostgreSQL Cluster (Prod)     — Criticidad: CRÍTICA
│   ├── SQL Server (Data Warehouse)   — Criticidad: ALTA
│   └── MongoDB (Logs & Analytics)    — Criticidad: MEDIA
│
├── 📡 Infraestructura & Red
│   ├── Core Network (Switches/Routers)— Criticidad: CRÍTICA
│   ├── VPN & Acceso Remoto           — Criticidad: ALTA
│   ├── Firewall / WAF                — Criticidad: CRÍTICA
│   └── WiFi Corporativa              — Criticidad: MEDIA
│
└── 🔐 Seguridad
    ├── Active Directory / LDAP       — Criticidad: CRÍTICA
    ├── Antivirus & EDR               — Criticidad: ALTA
    └── SIEM / SOC                    — Criticidad: ALTA
```

### 14.2 Configuración de SLAs por Sistema

| Sistema | P1 (Crítica) | P2 (Alta) | P3 (Media) | P4 (Baja) |
|---------|:----------:|:--------:|:---------:|:--------:|
| **Respuesta** | | | | |
| Core Network | 15 min | 30 min | 2h | 8h |
| PostgreSQL Prod | 15 min | 30 min | 2h | 8h |
| ERP SAP Prod | 30 min | 1h | 4h | 24h |
| Exchange Online | 30 min | 1h | 4h | 24h |
| Portal Web | 1h | 2h | 8h | 48h |
| **Resolución** | | | | |
| Core Network | 2h | 4h | 24h | 72h |
| PostgreSQL Prod | 2h | 4h | 24h | 72h |
| ERP SAP Prod | 4h | 8h | 48h | 120h |
| Exchange Online | 4h | 8h | 48h | 120h |
| Portal Web | 8h | 24h | 72h | 168h |

---

## 15. Seguridad y Auditoría

### 15.1 Medidas de Seguridad

| Capa | Medida | Detalle |
|------|--------|---------|
| **Autenticación** | JWT + Refresh Tokens | Access: 15min, Refresh: 7 días con rotación |
| **Contraseñas** | bcrypt (cost 12) | Política: min 10 chars, complejidad, historial |
| **Autorización** | RBAC + Row-Level Security | Políticas RLS en PostgreSQL para aislamiento |
| **Transporte** | TLS 1.3 | HSTS habilitado, certificados renovados automáticamente |
| **Archivos** | Scan + Signed URLs | ClamAV al upload, URLs con expiración |
| **SQL Injection** | Prepared Statements | ORM (Prisma/TypeORM) + validación de entrada |
| **XSS** | CSP + Sanitización | Content Security Policy estricta, DOMPurify |
| **CSRF** | Tokens CSRF | SameSite cookies + token en headers |
| **Rate Limiting** | Token Bucket | 100 req/min general, 5 req/min para login |
| **Auditoría** | Log inmutable | Toda acción registrada con IP, timestamp, actor |
| **Datos sensibles** | Enmascaramiento | PII enmascarada en logs, acceso por necesidad |

### 15.2 Seguridad del login y gestión de sesión

#### Flujo de autenticación recomendado

1. El usuario envía `email` y `password` al endpoint `POST /auth/login`.
2. El backend valida credenciales contra el hash almacenado en base de datos.
3. Si las credenciales son correctas, el sistema genera:
   - `access token` de corta duración.
   - `refresh token` rotativo.
4. El sistema registra auditoría del evento de login con IP, user-agent, fecha y resultado.
5. El frontend usa el `access token` para consumir la API.
6. Cuando el `access token` expira, se usa `POST /auth/refresh` para obtener un nuevo par de tokens.

#### Controles obligatorios del login

| Control | Requisito |
|---------|-----------|
| **Hash de contraseñas** | `bcrypt` con costo mínimo 12 |
| **Política de contraseña** | Mínimo 10 caracteres, mayúscula, minúscula, número y carácter especial |
| **Rate limiting** | Máximo 5 intentos por minuto por IP y controles adicionales por usuario |
| **Bloqueo temporal** | Bloqueo progresivo tras múltiples intentos fallidos |
| **Mensajes de error** | No revelar si falló el correo o la contraseña; respuesta genérica |
| **Auditoría** | Registrar login exitoso, fallido, logout, refresh, bloqueo y cambio de contraseña |
| **Sesión** | Invalidar refresh tokens al cerrar sesión o cambiar contraseña |
| **Cambio inicial** | Permitir obligar cambio de contraseña en primer ingreso |
| **Recuperación** | Enlaces de recuperación con un solo uso y expiración corta |

#### Manejo recomendado de tokens

| Token | Uso | Vigencia | Reglas |
|------|-----|----------|--------|
| **Access Token** | Autorización de requests | 15 minutos | Nunca persistir en logs; validar firma, expiración y claims |
| **Refresh Token** | Renovación de sesión | 7 días | Rotación en cada uso; revocable; almacenar hash si se persiste |

#### Claims mínimos del JWT

- `sub`: identificador único del usuario.
- `email`: correo autenticado.
- `role`: rol principal del usuario.
- `session_id`: identificador de sesión.
- `env`: entorno actual (`qas` o `production`).
- `iat` y `exp`: emisión y expiración.

#### Recomendación de almacenamiento en cliente

- Preferir `refresh token` en cookie `HttpOnly`, `Secure` y `SameSite`.
- Mantener el `access token` en memoria de aplicación o en cookie segura según la estrategia elegida.
- Evitar `localStorage` para tokens persistentes si se quiere reducir exposición ante XSS.

#### Eventos de seguridad asociados al login

- Intentos fallidos consecutivos.
- Inicio de sesión desde IP o dispositivo no habitual.
- Uso de refresh token revocado o reutilizado.
- Cambio de contraseña.
- Recuperación de contraseña.
- Cierre de sesión manual y expiración de sesión.

### 15.3 Estrategia de autenticación recomendada para PGI

La estrategia recomendada para PGI es:

- `Access Token JWT` de corta duración para autorización de la API.
- `Refresh Token` rotativo almacenado en cookie `HttpOnly`.
- Validación de rol y permisos en backend.
- Auditoría de sesión desde login hasta logout.

#### Decisión arquitectónica

Se recomienda **no** depender únicamente de un JWT persistido en `localStorage`.

La implementación objetivo será:

1. El usuario inicia sesión en `POST /auth/login`.
2. El backend valida credenciales.
3. El backend devuelve:
   - `access_token` con vigencia corta.
   - `refresh_token` en cookie segura `HttpOnly`.
4. El frontend utiliza el `access_token` para llamadas autenticadas.
5. Al expirar, el frontend solicita renovación en `POST /auth/refresh`.
6. El backend rota el `refresh_token` y emite un nuevo `access_token`.
7. En `logout`, el backend revoca la sesión y elimina la cookie.

#### Por qué esta estrategia

| Opción | Estado | Motivo |
|--------|--------|--------|
| **JWT en localStorage** | No recomendada | Mayor exposición ante XSS |
| **Sesión tradicional en servidor** | Válida pero no prioritaria | Requiere manejo centralizado adicional de sesiones |
| **JWT corto + refresh cookie HttpOnly** | Recomendada | Buen balance entre seguridad, escalabilidad y experiencia de usuario |

#### Configuración objetivo de sesión

| Elemento | Valor recomendado |
|----------|-------------------|
| **Access token** | 15 minutos |
| **Refresh token** | 7 días |
| **Cookie refresh** | `HttpOnly`, `Secure`, `SameSite=Lax` o `Strict` según flujo |
| **Rotación** | En cada uso de refresh |
| **Revocación** | En logout, cambio de contraseña, bloqueo de cuenta o actividad sospechosa |
| **Sesión por usuario** | Permitir control de sesiones activas por dispositivo si se requiere |

#### Claims mínimos del access token

```json
{
  "sub": "user-uuid",
  "email": "usuario@empresa.com",
  "role": "agent",
  "session_id": "sess-uuid",
  "env": "qas",
  "iat": 1713000000,
  "exp": 1713000900
}
```

#### Comportamiento esperado del frontend

- Guardar el `access_token` solo en memoria cuando sea posible.
- Nunca mostrar tokens en consola, errores o logs del navegador.
- Interceptar respuestas `401` para intentar `refresh` solo una vez por flujo.
- Redirigir al login si el refresh falla o la sesión fue revocada.
- Mostrar mensaje de sesión expirada sin revelar detalle interno.

#### Comportamiento esperado del backend

- Firmar tokens con secreto robusto y separado por entorno.
- Validar `issuer`, expiración y firma.
- Registrar hash del refresh token si se persiste en base de datos.
- Detectar reutilización de refresh token como evento de riesgo.
- Permitir cierre de todas las sesiones del usuario si cambia contraseña o se bloquea la cuenta.

#### Recomendación adicional para PGI

Si el proyecto más adelante integra `LDAP`, `Active Directory` o `SSO`, esta estrategia puede mantenerse dejando que el proveedor externo autentique al usuario y PGI siga administrando autorización, sesión interna, auditoría y expiración.

#### Diagrama de flujo de sesión

```text
┌──────────────┐
│   Usuario    │
└──────┬───────┘
       │
       │ 1. POST /auth/login
       │    email + password
       ▼
┌──────────────┐
│   Backend    │
│   Auth       │
└──────┬───────┘
       │
       │ 2. Valida credenciales
       │
       ├─────────────── credenciales inválidas ───────────────┐
       │                                                      │
       ▼                                                      ▼
┌──────────────┐                                    ┌──────────────────┐
│ Genera sesión│                                    │ Respuesta genérica│
│ y auditoría  │                                    │ login fallido     │
└──────┬───────┘                                    └──────────────────┘
       │
       │ 3. Devuelve:
       │    - access_token (15 min)
       │    - refresh_token (cookie HttpOnly)
       ▼
┌──────────────┐
│  Frontend    │
└──────┬───────┘
       │
       │ 4. Consume API con access token
       ▼
┌──────────────┐
│ API protegida│
└──────┬───────┘
       │
       ├──────── access token válido ────────► respuesta OK
       │
       └──────── access token expirado ──────┐
                                             │
                                             ▼
                                  ┌────────────────────┐
                                  │ POST /auth/refresh │
                                  └─────────┬──────────┘
                                            │
                     refresh válido         │         refresh inválido/revocado
                              ┌─────────────┴─────────────┐
                              ▼                           ▼
                    ┌──────────────────┐         ┌────────────────────┐
                    │ Rota refresh y   │         │ Sesión expirada o  │
                    │ emite nuevo      │         │ revocada           │
                    │ access token     │         └─────────┬──────────┘
                    └─────────┬────────┘                   │
                              │                            │
                              ▼                            ▼
                    ┌──────────────────┐         ┌────────────────────┐
                    │ Reintenta request│         │ Redirigir a login  │
                    │ original         │         │ y limpiar sesión   │
                    └──────────────────┘         └────────────────────┘


Flujo de logout
────────────────────────────────────────────────────────────────
Usuario
  │
  ├─► POST /auth/logout
  │
  └─► Backend revoca refresh token, registra auditoría y limpia cookie
       │
       └─► Frontend elimina estado local y redirige al login
```

#### Diagrama de recuperación de contraseña y cambio obligatorio

```text
Recuperación de contraseña
────────────────────────────────────────────────────────────────
Usuario
  │
  ├─► 1. POST /auth/forgot-password
  │      email
  │
  ▼
Backend Auth
  │
  ├─► 2. Respuesta genérica siempre:
  │      "Si el correo existe, se enviará un enlace"
  │
  ├─► 3. Si la cuenta existe:
  │      - genera token único de recuperación
  │      - asigna expiración corta
  │      - registra auditoría
  │      - envía correo
  │
  ▼
Correo del usuario
  │
  ├─► 4. Usuario abre enlace seguro
  │
  ▼
Frontend /auth/reset-password
  │
  ├─► 5. Usuario captura nueva contraseña
  │
  ├─► 6. POST /auth/reset-password
  │      token + nueva contraseña
  │
  ▼
Backend Auth
  │
  ├─► 7. Valida token, expiración y uso único
  ├─► 8. Actualiza password_hash
  ├─► 9. Revoca sesiones activas
  ├─► 10. Marca token como usado
  └─► 11. Registra auditoría y confirma cambio


Primer inicio de sesión con cambio obligatorio
────────────────────────────────────────────────────────────────
Usuario
  │
  ├─► 1. POST /auth/login
  │
  ▼
Backend Auth
  │
  ├─► 2. Credenciales válidas
  ├─► 3. Detecta flag: force_password_change = true
  │
  └─► 4. No habilita sesión completa todavía
        responde:
        - estado: PASSWORD_CHANGE_REQUIRED
        - token temporal de cambio

Frontend
  │
  ├─► 5. Redirige a pantalla de cambio obligatorio
  │
  ├─► 6. Usuario ingresa nueva contraseña
  │
  └─► 7. POST /auth/change-initial-password
        token temporal + nueva contraseña

Backend Auth
  │
  ├─► 8. Valida token temporal
  ├─► 9. Actualiza contraseña
  ├─► 10. Limpia flag de cambio obligatorio
  ├─► 11. Registra auditoría
  └─► 12. Crea sesión normal y devuelve tokens finales
```

### 15.4 Seguridad entre servicios y consumo interno

Aunque PGI puede desplegarse como un backend principal, internamente existen integraciones y servicios auxiliares que deben protegerse como si fueran comunicación entre servicios.

#### Reglas de confianza interna

| Servicio | Comunicación | Control requerido |
|---------|--------------|-------------------|
| **Frontend -> Backend** | HTTPS | JWT, CORS restringido, rate limiting |
| **Backend -> PostgreSQL** | Red privada/local | Usuario de BD con privilegios mínimos |
| **Backend -> Redis** | Red privada/local | Contraseña, bind privado, sin exposición pública |
| **Backend -> SMTP** | TLS | Credenciales dedicadas por entorno |
| **Backend -> Storage** | Red privada/local o HTTPS | Credenciales separadas y rutas controladas |
| **Backend -> WebSocket Gateway** | Interno | Validación de token en handshake |

#### Principios obligatorios para servicios

- Cada entorno debe tener credenciales distintas para base de datos, Redis, SMTP y storage.
- Ningún servicio interno debe confiar solo en “estar en la misma red”.
- Los secretos deben rotarse y nunca reutilizarse entre `QAS` y `Producción`.
- Los servicios internos no deben exponer puertos al público salvo `Nginx`.
- Toda integración saliente debe tener timeout, reintentos controlados y logging seguro.

#### Seguridad del WebSocket

| Control | Requisito |
|---------|-----------|
| **Handshake autenticado** | Validar JWT antes de abrir la conexión |
| **Autorización por canal** | Solo suscribirse a tickets y dashboards permitidos por rol |
| **Desconexión** | Cerrar conexión si el token expira o la sesión es revocada |
| **Aislamiento** | No emitir eventos sensibles a canales globales no autorizados |

#### Seguridad del servicio de correo

- Usar cuentas SMTP distintas por entorno.
- No enviar correos reales desde `QAS` a usuarios finales salvo listas controladas.
- Registrar estado de envío sin guardar credenciales ni cuerpos sensibles completos en logs.
- Firmar y versionar plantillas de correo para evitar cambios no auditados.

#### Seguridad del servicio de adjuntos

- Validar extensión, MIME, tamaño y nombre de archivo.
- Renombrar archivos al persistir para evitar ejecución o colisiones.
- Guardar checksum SHA-256 del archivo.
- Bloquear extensiones ejecutables y archivos potencialmente peligrosos.
- Servir descargas mediante autorización y expiración, no por acceso directo a carpeta pública.

### 15.5 Seguridad para despliegue en servidor web

#### Hardening del servidor

| Control | Requisito |
|---------|-----------|
| **Sistema operativo** | Mantener parches de seguridad al día y deshabilitar software no utilizado |
| **Usuarios del sistema** | Ejecutar `frontend`, `backend`, `postgresql` y `redis` con cuentas de servicio separadas |
| **Acceso administrativo** | Solo por `SSH` con llave pública, sin acceso por contraseña en producción |
| **Firewall** | Exponer solo `80/443` al público; `5432`, `6379` y puertos internos solo en red privada |
| **Puertos internos** | `Next.js` y `NestJS` deben escuchar en `127.0.0.1`, no en interfaces públicas |
| **Antimalware / EDR** | Recomendado para servidores corporativos con monitoreo activo |
| **Sincronización horaria** | `NTP` obligatorio para trazabilidad, logs y expiración de tokens |

#### Seguridad del reverse proxy (`Nginx`)

| Control | Requisito |
|---------|-----------|
| **HTTPS obligatorio** | Redirigir todo tráfico HTTP a HTTPS |
| **TLS** | Usar TLS 1.2+ y preferentemente TLS 1.3 con certificados vigentes |
| **HSTS** | Habilitar `Strict-Transport-Security` en producción |
| **Cabeceras** | Configurar `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |
| **Body size** | Limitar `client_max_body_size` a 25MB alineado con la política de adjuntos |
| **Rate limiting** | Aplicar límites especiales sobre `/auth/login`, `/auth/refresh` y endpoints públicos |
| **WebSocket** | Permitir upgrade únicamente en `/ws` |
| **Ocultación** | No exponer versión de `Nginx` ni cabeceras innecesarias |

#### Seguridad de aplicación

| Control | Requisito |
|---------|-----------|
| **Variables sensibles** | Nunca guardar secretos en repositorio; usar `.env` protegidos o gestor de secretos |
| **Cookies / tokens** | Si se usan cookies, marcar `HttpOnly`, `Secure` y `SameSite=Strict` o `Lax` según flujo |
| **CORS** | Restringido a dominios oficiales de `QAS` y `Producción` |
| **Uploads** | Validar tipo MIME, extensión, tamaño y hacer escaneo antivirus antes de persistir |
| **Adjuntos** | Guardar fuera de `public/`; servir solo con autorización y URL firmada o endpoint protegido |
| **Errores** | No exponer stack traces en producción |
| **Logs** | No registrar contraseñas, tokens, cookies, códigos de recuperación ni PII completa |

#### Seguridad de base de datos y Redis

| Componente | Requisito |
|------------|-----------|
| **PostgreSQL** | No expuesto a Internet; acceso solo desde backend o red privada autorizada |
| **Roles DB** | Usuario de aplicación con privilegios mínimos; cuentas administrativas separadas |
| **Backups** | Cifrados en reposo y almacenados fuera del servidor principal |
| **Redis** | Con contraseña, bind privado y sin exposición pública |
| **Conexiones** | Forzar credenciales distintas para `QAS` y `Producción` |

#### Seguridad operativa

- Rotar `JWT_SECRET`, credenciales SMTP, base de datos y Redis bajo procedimiento controlado.
- Mantener separados certificados, logs, backups y adjuntos por entorno.
- Revisar logs de acceso, intentos fallidos de login y eventos críticos de forma periódica.
- Definir procedimiento de respuesta ante incidentes: contención, análisis, restauración y comunicación.

### 15.6 Checklist mínimo antes de publicar en Internet

- Servidor actualizado y endurecido.
- Acceso `SSH` restringido por llaves y firewall.
- `Nginx` configurado con HTTPS y redirección forzada.
- Puertos `3000`, `3001`, `5432` y `6379` no accesibles desde Internet.
- Variables `.env` protegidas con permisos restringidos.
- Usuario de sistema no privilegiado para procesos de aplicación.
- Cabeceras de seguridad activas.
- Rate limiting de login validado.
- CORS limitado a dominios oficiales.
- Prueba de subida de adjuntos con validación y bloqueo de archivos no permitidos.
- Backup, restauración y auditoría verificados.

### 15.7 Row-Level Security (PostgreSQL)

```sql
-- Los reporters solo ven sus propias incidencias
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY reporter_own_incidents ON incidents
    FOR SELECT TO reporter_role
    USING (reporter_id = current_setting('app.current_user_id')::UUID);

-- Los agentes ven todo
CREATE POLICY agent_all_incidents ON incidents
    FOR ALL TO agent_role
    USING (true);

-- Los comentarios internos solo son visibles para agentes+
CREATE POLICY internal_comments ON incident_comments
    FOR SELECT
    USING (
        is_internal = false
        OR current_setting('app.current_role') IN ('agent', 'supervisor', 'admin')
    );
```

---

## 16. Stack Tecnológico

### 16.1 Stack Recomendado

```
┌──────────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                            │
│  ─────────                                                           │
│  Framework:    Next.js 14+ (App Router) / React 18+                 │
│  UI Library:   shadcn/ui + Tailwind CSS                             │
│  Estado:       Zustand + React Query (TanStack)                     │
│  Real-time:    Socket.io-client                                      │
│  Forms:        React Hook Form + Zod (validación)                   │
│  Editor Rico:  Tiptap (para descripciones y comentarios)            │
│  Tablas:       TanStack Table v8 (sorting, filtering, pagination)   │
│  Gráficas:     Recharts + D3.js (reportería avanzada)              │
│  Upload:       react-dropzone + tus.io (resumable uploads)          │
│  PDF Export:   @react-pdf/renderer                                   │
│  i18n:         next-intl (español + inglés)                          │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  BACKEND                                                             │
│  ────────                                                            │
│  Runtime:      Node.js 20 LTS                                       │
│  Framework:    NestJS (TypeScript)                                   │
│  ORM:          Prisma ORM (PostgreSQL)                               │
│  Auth:         Passport.js + JWT                                     │
│  Validación:   class-validator + class-transformer                   │
│  WebSockets:   Socket.io (con Redis adapter)                         │
│  Email:        Nodemailer + Handlebars templates                     │
│  Colas:        BullMQ (sobre Redis)                                  │
│  Storage:      MinIO / S3-compatible SDK                             │
│  Caché:        Redis (ioredis)                                       │
│  Logging:      Pino + ELK Stack                                      │
│  Testing:      Jest + Supertest                                       │
│  API Docs:     Swagger (via @nestjs/swagger)                         │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  BASE DE DATOS                                                       │
│  ────────────                                                        │
│  Primary:      PostgreSQL 16+                                        │
│  Extensiones:  uuid-ossp, pgcrypto, pg_trgm, pg_stat_statements    │
│  Caché:        Redis 7+                                              │
│  Object Store: MinIO (adjuntos)                                      │
│  Full-text:    PostgreSQL built-in (tsvector/tsquery)               │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  INFRAESTRUCTURA                                                     │
│  ────────────────                                                    │
│  Despliegue:    Servicios nativos por entorno                        │
│  Proceso:       PM2 / systemd / NSSM                                 │
│  CI/CD:        GitHub Actions / GitLab CI                            │
│  Reverse Proxy:Nginx                                                 │
│  Monitoring:   Prometheus + Grafana                                  │
│  Logging:      ELK Stack (Elasticsearch, Logstash, Kibana)          │
│  Backup DB:    pg_dump automático + WAL archiving                    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 17. Wireframes Completos

> **Catálogo completo de todas las pantallas de PGI, organizadas por interfaz.**
> Cada wireframe refleja el estado final esperado de la pantalla en producción.

---

### 17.1 PANTALLAS COMPARTIDAS

---

#### WF-00: Pantalla de Login

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│                                                                        │
│                                                                        │
│                       ┌──────────────────────────┐                     │
│                       │                          │                     │
│                       │  ENTORNO: QAS            │                     │
│                       │  URL: qas.pgi.local      │                     │
│                       │                          │                     │
│                       │      🛡️ P G I            │                     │
│                       │  Plataforma de Gestión   │                     │
│                       │     de Incidencias       │                     │
│                       │                          │                     │
│                       │  ┌────────────────────┐  │                     │
│                       │  │ usuario@empresa.com│  │                     │
│                       │  └────────────────────┘  │                     │
│                       │                          │                     │
│                       │  ┌────────────────────┐  │                     │
│                       │  │ ••••••••••         │  │                     │
│                       │  └────────────────────┘  │                     │
│                       │                          │                     │
│                       │  ☐ Recordar sesión       │                     │
│                       │                          │                     │
│                       │  ┌────────────────────┐  │                     │
│                       │  │   INICIAR SESIÓN   │  │                     │
│                       │  └────────────────────┘  │                     │
│                       │                          │                     │
│                       │  Entorno de pruebas y    │                     │
│                       │  validación con usuarios │                     │
│                       │                          │                     │
│                       │  ¿Olvidaste tu           │                     │
│                       │  contraseña?             │                     │
│                       │                          │                     │
│                       └──────────────────────────┘                     │
│                                                                        │
│            Badge visible por entorno: QAS (naranja) / PROD (verde)    │
│                       v2.0 · © 2026 PGI                                │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Comportamiento requerido del login por entorno**

- El login debe mostrar siempre un `badge` visible con el nombre del entorno activo.
- En `QAS`, el login debe incluir un texto de advertencia indicando que es un ambiente de pruebas o validación.
- En `producción`, el login debe mostrar identidad limpia, sin advertencias técnicas, pero conservando la etiqueta `PROD`.
- El color del encabezado y del badge debe cambiar según el entorno para evitar confusiones operativas.
- El entorno debe resolverse desde variables de configuración y no desde lógica hardcodeada.

---

#### WF-01: Recuperación de Contraseña

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│                       ┌──────────────────────────┐                     │
│                       │                          │                     │
│                       │      🛡️ P G I            │                     │
│                       │                          │                     │
│                       │  Recuperar Contraseña    │                     │
│                       │  ─────────────────────   │                     │
│                       │                          │                     │
│                       │  Ingresa tu correo       │                     │
│                       │  electrónico y te        │                     │
│                       │  enviaremos un enlace    │                     │
│                       │  para restablecer tu     │                     │
│                       │  contraseña.             │                     │
│                       │                          │                     │
│                       │  ┌────────────────────┐  │                     │
│                       │  │ correo@empresa.com │  │                     │
│                       │  └────────────────────┘  │                     │
│                       │                          │                     │
│                       │  ┌────────────────────┐  │                     │
│                       │  │  ENVIAR ENLACE     │  │                     │
│                       │  └────────────────────┘  │                     │
│                       │                          │                     │
│                       │  ← Volver al login       │                     │
│                       │                          │                     │
│                       └──────────────────────────┘                     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-02: Restablecer Contraseña (desde enlace del email)

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│                       ┌──────────────────────────┐                     │
│                       │                          │                     │
│                       │      🛡️ P G I            │                     │
│                       │                          │                     │
│                       │  Nueva Contraseña        │                     │
│                       │  ─────────────────       │                     │
│                       │                          │                     │
│                       │  Nueva contraseña:       │                     │
│                       │  ┌────────────────────┐  │                     │
│                       │  │ ••••••••••         │  │                     │
│                       │  └────────────────────┘  │                     │
│                       │  Min 10 chars · Mayúsc.  │                     │
│                       │  · Número · Especial     │                     │
│                       │                          │                     │
│                       │  Confirmar contraseña:   │                     │
│                       │  ┌────────────────────┐  │                     │
│                       │  │ ••••••••••         │  │                     │
│                       │  └────────────────────┘  │                     │
│                       │  ✅ Las contraseñas      │                     │
│                       │     coinciden            │                     │
│                       │                          │                     │
│                       │  ┌────────────────────┐  │                     │
│                       │  │   GUARDAR          │  │                     │
│                       │  └────────────────────┘  │                     │
│                       │                          │                     │
│                       └──────────────────────────┘                     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 17.2 PORTAL DE USUARIO (Reporter)

---

#### WF-10: Dashboard Personal del Usuario

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI                    Inicio │ Mis Tickets │ Nuevo          María G. | ⚙️ │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Hola, María 👋                                        🔔 2 notificaciones    │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                    ┌────────────────────────────────────────────────┐    │  │
│  │                    │  ➕  REPORTAR NUEVA INCIDENCIA                │    │  │
│  │                    │     Inicia un nuevo ticket de soporte          │    │  │
│  │                    └────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │ 🎫 5       │  │ ⏳ 1       │  │ ✅ 12      │  │ ⚠️ 1       │              │
│  │ Activos    │  │ Requieren  │  │ Resueltos  │  │ Reabiertos │              │
│  │            │  │ mi acción  │  │ (30 días)  │  │            │              │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘              │
│                                                                                │
│  ─── TICKETS QUE REQUIEREN MI ACCIÓN ─────────────────────────────────────    │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  ⚠️ PGI-2026-000140  │  VPN desconecta intermitentemente               │  │
│  │  Estado: Esperando tu información  │  Agente: Pedro Salinas             │  │
│  │  Mensaje: "¿Puedes indicar la hora exacta y tu ubicación?"             │  │
│  │                                                 [ Responder ahora → ]   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ─── MIS TICKETS ACTIVOS ─────────────────────────────────────────────────    │
│                                                                                │
│  ┌──────────────────────────────────────┐  ┌──────────────────────────────┐   │
│  │  PGI-2026-000142                     │  │  PGI-2026-000139            │   │
│  │  Error autenticación portal          │  │  Lentitud en red piso 3     │   │
│  │  🔴 Alta   🔵 En Progreso           │  │  🟡 Media   ⚪ Abierto     │   │
│  │  Agente: Carlos Ramírez             │  │  Agente: Sin asignar        │   │
│  │  Últ. actividad: Hace 2h           │  │  Últ. actividad: Hace 5h   │   │
│  │                          [ Ver → ]  │  │                    [ Ver → ]│   │
│  └──────────────────────────────────────┘  └──────────────────────────────┘   │
│                                                                                │
│  ┌──────────────────────────────────────┐  ┌──────────────────────────────┐   │
│  │  PGI-2026-000138                     │  │  PGI-2026-000135            │   │
│  │  Impresora HP-4050 no imprime       │  │  Error al exportar PDF SAP  │   │
│  │  🟢 Baja   ✅ Resuelto              │  │  🟡 Media   🟡 Asignado    │   │
│  │  Agente: Ana Torres                 │  │  Agente: Laura Méndez      │   │
│  │  Resuelto: Hace 1 día              │  │  Últ. actividad: Hace 1d   │   │
│  │          [ Confirmar ] [ Reabrir ]  │  │                    [ Ver → ]│   │
│  └──────────────────────────────────────┘  └──────────────────────────────┘   │
│                                                                                │
│  ─── ACTIVIDAD RECIENTE ──────────────────────────────────────────────────    │
│                                                                                │
│  🕐 14:32  Carlos Ramírez comentó en PGI-000142: "Identificamos el error..."│
│  🕐 12:00  Ana Torres resolvió PGI-000138: "Se reemplazó el rodillo..."     │
│  🕐 09:15  Pedro Salinas solicitó información en PGI-000140                  │
│  🕐 Ayer   Laura Méndez fue asignada a PGI-000135                           │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-11: Crear Incidencia — Paso 1: Seleccionar Sistema

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI                    Inicio │ Mis Tickets │ Nuevo          María G. | ⚙️ │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Nueva Incidencia                                                              │
│  ─────────────────                                                             │
│                                                                                │
│  ① Sistema     ② Descripción     ③ Evidencia     ④ Confirmar                  │
│  ━━━━━━━━━━    ────────────      ────────────     ────────────                │
│                                                                                │
│  ¿Cuál sistema está presentando el problema?                                   │
│                                                                                │
│  🔍 Buscar sistema...                                                         │
│                                                                                │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐          │
│  │  🏢 ERP SAP       │  │  📧 Exchange      │  │  🌐 Portal Web   │          │
│  │  S/4HANA          │  │  Online           │  │  Corporativo      │          │
│  │  Producción       │  │  Correo corp.     │  │  Sitio público    │          │
│  │  SLA: 4h (P2)     │  │  SLA: 4h (P2)     │  │  SLA: 8h (P2)     │          │
│  │                   │  │                   │  │                    │          │
│  │  ○ Seleccionar    │  │  ○ Seleccionar    │  │  ● Seleccionado   │          │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘          │
│                                                                                │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐          │
│  │  🗄️ Base Datos    │  │  📡 Red / VPN     │  │  💬 Teams         │          │
│  │  PostgreSQL       │  │  Conectividad     │  │  Microsoft Teams  │          │
│  │  Cluster Prod     │  │  y acceso remoto  │  │  Colaboración     │          │
│  │  SLA: 2h (P2)     │  │  SLA: 4h (P2)     │  │  SLA: 4h (P2)     │          │
│  │                   │  │                   │  │                    │          │
│  │  ○ Seleccionar    │  │  ○ Seleccionar    │  │  ○ Seleccionar    │          │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘          │
│                                                                                │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐          │
│  │  🔐 Active Dir.   │  │  🖨️ Impresoras    │  │  📱 App Móvil     │          │
│  │  LDAP / SSO       │  │  Equipos de       │  │  de Ventas        │          │
│  │  Autenticación    │  │  impresión        │  │  iOS / Android    │          │
│  │  SLA: 2h (P2)     │  │  SLA: 24h (P2)    │  │  SLA: 8h (P2)     │          │
│  │                   │  │                   │  │                    │          │
│  │  ○ Seleccionar    │  │  ○ Seleccionar    │  │  ○ Seleccionar    │          │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘          │
│                                                                                │
│  ¿No encuentras tu sistema?  [ Solicitar registro de nuevo sistema ]           │
│                                                                                │
│                                           [ Cancelar ]  [ Siguiente → ]        │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-12: Crear Incidencia — Paso 2: Descripción del Problema

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI                    Inicio │ Mis Tickets │ Nuevo          María G. | ⚙️ │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Nueva Incidencia  ·  Sistema: 🌐 Portal Web Corporativo                      │
│  ─────────────────                                                             │
│                                                                                │
│  ① Sistema     ② Descripción     ③ Evidencia     ④ Confirmar                  │
│  ──────────    ━━━━━━━━━━━━      ────────────     ────────────                │
│                                                                                │
│  Título del problema: *                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Error de autenticación al intentar acceder al portal web               │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  Categoría:                         Subcategoría:                              │
│  ┌──────────────────────┐          ┌──────────────────────┐                   │
│  │ Acceso / Autenticación ▼│          │ Error de login       ▼│                   │
│  └──────────────────────┘          └──────────────────────┘                   │
│                                                                                │
│  Descripción detallada: *                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                          │  │
│  │  Al intentar iniciar sesión en el portal web corporativo con mis        │  │
│  │  credenciales habituales, el sistema muestra el error "AUTH_FAILED_503" │  │
│  │  después de 15 segundos de carga. Esto ocurre desde las 9:00 AM.       │  │
│  │                                                                          │  │
│  │  Pasos para reproducir:                                                  │  │
│  │  1. Ir a portal.empresa.com                                              │  │
│  │  2. Ingresar usuario y contraseña                                        │  │
│  │  3. Hacer click en "Entrar"                                              │  │
│  │  4. Aparece error AUTH_FAILED_503                                        │  │
│  │                                                                          │  │
│  │  Ya intenté limpiar caché y cookies sin éxito.                           │  │
│  │                                                                          │  │
│  │  B  I  U  📎  🔗  📋  ≡  ⟨/⟩                                           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ¿Cuántos usuarios están afectados? (opcional)                                 │
│  ┌──────────────────────┐                                                      │
│  │ Solo yo              ▼│                                                      │
│  └──────────────────────┘                                                      │
│  Opciones: Solo yo · Mi equipo (2-10) · Mi departamento (10-50) · Toda la org │
│                                                                                │
│  💡 Sugerencias similares:                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  📌 PGI-2026-000128 "Error 503 en portal - Resuelto hace 5 días"       │  │
│  │  📌 PGI-2026-000099 "Login falla intermitentemente - Cerrado"          │  │
│  │  ¿Es tu mismo problema? [ Sí, reabrir ] [ No, continuar con el mío ]  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│                                    [ ← Anterior ]  [ Siguiente → ]            │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-13: Crear Incidencia — Paso 3: Adjuntar Evidencia

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI                    Inicio │ Mis Tickets │ Nuevo          María G. | ⚙️ │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Nueva Incidencia  ·  Sistema: 🌐 Portal Web Corporativo                      │
│  ─────────────────                                                             │
│                                                                                │
│  ① Sistema     ② Descripción     ③ Evidencia     ④ Confirmar                  │
│  ──────────    ────────────      ━━━━━━━━━━━━     ────────────                │
│                                                                                │
│  Adjunta evidencia del problema (capturas, logs, documentos):                  │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                          │  │
│  │              ┌──────────────────────────────────┐                        │  │
│  │              │                                  │                        │  │
│  │              │    📎 Arrastra archivos aquí     │                        │  │
│  │              │                                  │                        │  │
│  │              │    o haz click para              │                        │  │
│  │              │    seleccionar archivos          │                        │  │
│  │              │                                  │                        │  │
│  │              │    ─────────────────────         │                        │  │
│  │              │    También puedes pegar          │                        │  │
│  │              │    capturas con Ctrl+V           │                        │  │
│  │              │                                  │                        │  │
│  │              └──────────────────────────────────┘                        │  │
│  │                                                                          │  │
│  │  Formatos: PNG, JPG, GIF, PDF, TXT, LOG, CSV, DOC, DOCX,               │  │
│  │            XLS, XLSX, MP4, ZIP   ·   Máximo: 25MB por archivo           │  │
│  │                                                                          │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  Archivos adjuntos (3):                                                        │
│                                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                         │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │                         │
│  │ │  📸      │ │  │ │  📸      │ │  │ │  📄      │ │                         │
│  │ │ preview  │ │  │ │ preview  │ │  │ │ .txt     │ │                         │
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │                         │
│  │ error_503    │  │ pantalla     │  │ console      │                         │
│  │ _login.png   │  │ _blanca.png  │  │ _log.txt     │                         │
│  │ 245 KB  ✅   │  │ 180 KB  ✅   │  │ 12 KB  ✅    │                         │
│  │     [ × ]    │  │     [ × ]    │  │     [ × ]    │                         │
│  └──────────────┘  └──────────────┘  └──────────────┘                         │
│                                                                                │
│  💡 Tip: Mientras más evidencia adjuntes, más rápido podremos ayudarte.       │
│                                                                                │
│                                    [ ← Anterior ]  [ Siguiente → ]            │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-14: Crear Incidencia — Paso 4: Confirmar y Enviar

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI                    Inicio │ Mis Tickets │ Nuevo          María G. | ⚙️ │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Nueva Incidencia  ·  Confirmación                                             │
│  ─────────────────                                                             │
│                                                                                │
│  ① Sistema     ② Descripción     ③ Evidencia     ④ Confirmar                  │
│  ──────────    ────────────      ────────────     ━━━━━━━━━━━━                │
│                                                                                │
│  Revisa los datos antes de enviar:                                             │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                          │  │
│  │  SISTEMA AFECTADO                                                        │  │
│  │  🌐 Portal Web Corporativo                                     [ ✏️ ]   │  │
│  │                                                                          │  │
│  │  ─────────────────────────────────────────────────────────────────────   │  │
│  │                                                                          │  │
│  │  TÍTULO                                                                  │  │
│  │  Error de autenticación al intentar acceder al portal web     [ ✏️ ]   │  │
│  │                                                                          │  │
│  │  CATEGORÍA                                                               │  │
│  │  Acceso / Autenticación  →  Error de login                    [ ✏️ ]   │  │
│  │                                                                          │  │
│  │  DESCRIPCIÓN                                                             │  │
│  │  Al intentar iniciar sesión en el portal web corporativo      [ ✏️ ]   │  │
│  │  con mis credenciales habituales, el sistema muestra el                  │  │
│  │  error "AUTH_FAILED_503" después de 15 segundos de carga...             │  │
│  │                                                                          │  │
│  │  IMPACTO                                                                 │  │
│  │  Solo yo                                                      [ ✏️ ]   │  │
│  │                                                                          │  │
│  │  EVIDENCIA ADJUNTA                                                       │  │
│  │  📸 error_503_login.png (245 KB)                              [ ✏️ ]   │  │
│  │  📸 pantalla_blanca.png (180 KB)                                        │  │
│  │  📄 console_log.txt (12 KB)                                             │  │
│  │                                                                          │  │
│  │  ─────────────────────────────────────────────────────────────────────   │  │
│  │                                                                          │  │
│  │  ℹ️  Tu ticket será atendido con un SLA de respuesta de 2h              │  │
│  │      y resolución de 24h según la prioridad asignada.                   │  │
│  │      Recibirás un email de confirmación con el número de ticket.        │  │
│  │                                                                          │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│                                    [ ← Anterior ]  [ ✅ ENVIAR INCIDENCIA ]   │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-15: Confirmación de Envío Exitoso

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI                    Inicio │ Mis Tickets │ Nuevo          María G. | ⚙️ │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│                                                                                │
│                                                                                │
│               ┌────────────────────────────────────────────┐                   │
│               │                                            │                   │
│               │              ✅                             │                   │
│               │                                            │                   │
│               │     ¡Incidencia creada con éxito!          │                   │
│               │                                            │                   │
│               │     Tu número de ticket es:                │                   │
│               │                                            │                   │
│               │     ┌──────────────────────────────┐       │                   │
│               │     │     PGI-2026-000142          │       │                   │
│               │     └──────────────────────────────┘       │                   │
│               │                                            │                   │
│               │     Se ha enviado un email de              │                   │
│               │     confirmación a:                        │                   │
│               │     maria.garcia@empresa.com               │                   │
│               │                                            │                   │
│               │     Nuestro equipo revisará tu             │                   │
│               │     incidencia y te contactará             │                   │
│               │     a la brevedad.                         │                   │
│               │                                            │                   │
│               │  ┌──────────────┐  ┌──────────────────┐   │                   │
│               │  │ Ver mi ticket│  │ Crear otro ticket │   │                   │
│               │  └──────────────┘  └──────────────────┘   │                   │
│               │                                            │                   │
│               └────────────────────────────────────────────┘                   │
│                                                                                │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-16: Mis Incidencias — Lista Completa

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI                    Inicio │ Mis Tickets │ Nuevo          María G. | ⚙️ │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Mis Incidencias (18 total)                                                    │
│  ──────────────────────────                                                    │
│                                                                                │
│  🔍 Buscar en mis tickets...                                                  │
│                                                                                │
│  Filtros:  Estado: [Todos      ▼]  Sistema: [Todos      ▼]  Ordenar: [Más    │
│                                                                  reciente ▼]  │
│                                                                                │
│  Vista:  [☷ Tarjetas]  [≡ Lista]                                              │
│                                                                                │
│  ─── REQUIEREN MI ACCIÓN (1) ─────────────────────────────────────────────    │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  ⚠️ PGI-2026-000140  ·  VPN desconecta intermitentemente               │  │
│  │  📡 Red/VPN  ·  🟠 Media  ·  ⏳ Esperando tu información               │  │
│  │  Agente: Pedro Salinas  ·  Creado: 12/04/2026 15:30                    │  │
│  │  "Pedro te ha solicitado información adicional"                         │  │
│  │                                                      [ Responder → ]    │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ─── ACTIVOS (4) ─────────────────────────────────────────────────────────    │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  PGI-2026-000142  ·  Error autenticación portal web                     │  │
│  │  🌐 Portal Web  ·  🔴 Alta  ·  🔵 En Progreso                          │  │
│  │  Agente: Carlos Ramírez  ·  Creado: 13/04/2026 10:15                   │  │
│  │  Últ. actividad: "Inicio de diagnóstico..." (hace 2h)                  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  PGI-2026-000139  ·  Lentitud en red piso 3                            │  │
│  │  📡 Red/VPN  ·  🟡 Media  ·  ⚪ Abierto (sin asignar)                  │  │
│  │  Creado: 13/04/2026 08:45                                               │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ─── RESUELTOS — PENDIENTE DE CONFIRMACIÓN (1) ──────────────────────────    │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  ✅ PGI-2026-000138  ·  Impresora HP-4050 no imprime                   │  │
│  │  🖨️ Impresoras  ·  🟢 Baja  ·  ✅ Resuelto                             │  │
│  │  Agente: Ana Torres  ·  Resuelto: 12/04/2026 16:00                    │  │
│  │  Resolución: "Se reemplazó el rodillo de alimentación"                 │  │
│  │                                     [ ✅ Confirmar ]  [ ↩️ Reabrir ]    │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ─── CERRADOS RECIENTES (12) ─────────────────────────────────────────────    │
│                                                                                │
│  PGI-2026-000130  ·  Acceso denegado a carpeta compartida  ·  Cerrado 10/04  │
│  PGI-2026-000125  ·  Teams no sincroniza mensajes  ·  Cerrado 08/04          │
│  PGI-2026-000118  ·  Error al generar nómina en SAP  ·  Cerrado 05/04        │
│  ...ver más                                                                    │
│                                                                                │
│  Mostrando 1-10 de 18          [ ← Anterior ]  1  2  [ Siguiente → ]         │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-17: Detalle de Incidencia — Vista Usuario con Timeline

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI                    Inicio │ Mis Tickets │ Nuevo            María G. | ⚙️│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ← Volver a mis incidencias                                                     │
│                                                                                  │
│  ┌───────────────────────────────────────────────┐  ┌─────────────────────────┐  │
│  │                                               │  │  DETALLES DEL TICKET   │  │
│  │  PGI-2026-000142                              │  │  ────────────────────  │  │
│  │  ━━━━━━━━━━━━━━━                              │  │                         │  │
│  │  Error de autenticación al intentar           │  │  Estado:                │  │
│  │  acceder al portal web                        │  │  🔵 En Progreso        │  │
│  │                                               │  │                         │  │
│  │  Prioridad: 🔴 Alta                          │  │  Prioridad:             │  │
│  │  SLA Resolución: 6h restantes ⏱️              │  │  🔴 Alta (P2)          │  │
│  │  ┌──────────────────────────────────────────┐ │  │                         │  │
│  │  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░  75% SLA    │ │  │  Sistema:               │  │
│  │  └──────────────────────────────────────────┘ │  │  🌐 Portal Web Corp.   │  │
│  │                                               │  │                         │  │
│  │  ─── TIMELINE ────────────────────────────    │  │  Agente asignado:      │  │
│  │                                               │  │  👤 Carlos Ramírez     │  │
│  │  ● 14:30  Carlos Ramírez   (Agente)          │  │     Soporte N2          │  │
│  │  │  ✏️ Cambió estado: Asignado → En Progreso │  │                         │  │
│  │  │  💬 "Inicio de diagnóstico. Revisando     │  │  Creado:                │  │
│  │  │     los logs del servicio de               │  │  13/04/2026 10:15      │  │
│  │  │     autenticación LDAP."                   │  │                         │  │
│  │  │                                            │  │  Última actividad:     │  │
│  │  ● 12:05  Sistema                            │  │  13/04/2026 14:30      │  │
│  │  │  👤 Asignado a Carlos Ramírez              │  │                         │  │
│  │  │                                            │  │  ─── SLA ────────────  │  │
│  │  ● 10:20  Sistema                            │  │                         │  │
│  │  │  ✉️ Email de confirmación enviado          │  │  Respuesta: ✅ 1h 50m  │  │
│  │  │     a maria.garcia@empresa.com             │  │  (SLA: 2h)             │  │
│  │  │                                            │  │                         │  │
│  │  ● 10:15  María García   (Tú)               │  │  Resolución: ⏱️ 6h rest │  │
│  │  │  🎫 Incidencia creada                     │  │  (SLA: 24h)            │  │
│  │  │  📎 3 archivos adjuntos                    │  │                         │  │
│  │  │  ├── 📸 error_503_login.png (245 KB)      │  │  ─── ADJUNTOS (3) ──  │  │
│  │  │  ├── 📸 pantalla_blanca.png (180 KB)      │  │                         │  │
│  │  │  └── 📄 console_log.txt (12 KB)           │  │  📸 error_503_login    │  │
│  │  │                                            │  │     .png  245 KB       │  │
│  │                                               │  │     [ 👁️ ] [ ⬇️ ]      │  │
│  │  ─── COMENTARIOS ─────────────────────────    │  │                         │  │
│  │                                               │  │  📸 pantalla_blanca    │  │
│  │  Carlos Ramírez · 14:35                      │  │     .png  180 KB       │  │
│  │  ┌──────────────────────────────────────────┐ │  │     [ 👁️ ] [ ⬇️ ]      │  │
│  │  │ Hola María, estoy revisando el caso.     │ │  │                         │  │
│  │  │ ¿Podrías decirme si otros compañeros de  │ │  │  📄 console_log.txt   │  │
│  │  │ tu departamento tienen el mismo problema? │ │  │     12 KB              │  │
│  │  └──────────────────────────────────────────┘ │  │     [ 👁️ ] [ ⬇️ ]      │  │
│  │                                               │  │                         │  │
│  │  ┌──────────────────────────────────────────┐ │  │  [ + Adjuntar más ]    │  │
│  │  │  Escribe una respuesta...                │ │  │                         │  │
│  │  │                                          │ │  └─────────────────────────┘  │
│  │  │                                          │ │                                │
│  │  │  B  I  U  📎  🔗                        │ │                                │
│  │  │                                          │ │                                │
│  │  │          📎 Adjuntar     [ Enviar ]      │ │                                │
│  │  └──────────────────────────────────────────┘ │                                │
│  │                                               │                                │
│  └───────────────────────────────────────────────┘                                │
│                                                                                    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-18: Confirmar Resolución / Reabrir Incidencia

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI                    Inicio │ Mis Tickets │ Nuevo            María G. | ⚙️│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ← Volver a mis incidencias                                                     │
│                                                                                  │
│  PGI-2026-000138  ·  Impresora HP-4050 no imprime                               │
│  Estado: ✅ Resuelto   Prioridad: 🟢 Baja   Agente: Ana Torres                 │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                            │  │
│  │  📋 RESUMEN DE RESOLUCIÓN                                                 │  │
│  │  ────────────────────────                                                  │  │
│  │                                                                            │  │
│  │  Agente: Ana Torres                                                        │  │
│  │  Fecha de resolución: 12/04/2026 16:00                                    │  │
│  │  Tiempo total: 1 día 3 horas                                              │  │
│  │                                                                            │  │
│  │  Diagnóstico:                                                              │  │
│  │  El rodillo de alimentación de papel presentaba desgaste excesivo,        │  │
│  │  causando atascos frecuentes y fallas en la alimentación.                 │  │
│  │                                                                            │  │
│  │  Solución aplicada:                                                        │  │
│  │  Se reemplazó el rodillo de alimentación (pieza HP-RF0-1008).             │  │
│  │  Se realizó limpieza general del mecanismo de impresión.                  │  │
│  │  Se imprimieron 5 páginas de prueba exitosamente.                         │  │
│  │                                                                            │  │
│  │  📎 Adjunto: foto_rodillo_nuevo.jpg (320 KB)                             │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                            │  │
│  │  ¿El problema fue resuelto satisfactoriamente?                            │  │
│  │                                                                            │  │
│  │  ┌─────────────────────────────┐  ┌──────────────────────────────────┐    │  │
│  │  │                             │  │                                  │    │  │
│  │  │  ✅ SÍ, CONFIRMAR CIERRE   │  │  ↩️ NO, REABRIR INCIDENCIA      │    │  │
│  │  │                             │  │                                  │    │  │
│  │  │  El problema está resuelto. │  │  El problema persiste o volvió. │    │  │
│  │  │  Se te pedirá una breve     │  │  Se te pedirá explicar qué      │    │  │
│  │  │  encuesta de satisfacción.  │  │  sigue ocurriendo.              │    │  │
│  │  │                             │  │                                  │    │  │
│  │  └─────────────────────────────┘  └──────────────────────────────────┘    │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-19: Encuesta de Satisfacción (Post-Cierre)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI                    Inicio │ Mis Tickets │ Nuevo            María G. | ⚙️│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                                                                                  │
│          ┌─────────────────────────────────────────────────────────┐              │
│          │                                                         │              │
│          │  ⭐ ENCUESTA DE SATISFACCIÓN                            │              │
│          │  ──────────────────────────                             │              │
│          │                                                         │              │
│          │  PGI-2026-000138 · Impresora HP-4050 no imprime        │              │
│          │  Agente: Ana Torres                                     │              │
│          │                                                         │              │
│          │  ¿Cómo calificarías la atención recibida?              │              │
│          │                                                         │              │
│          │       ☆      ☆      ★      ★      ★                   │              │
│          │       1      2      3      4      5                    │              │
│          │    Pésimo  Malo  Regular Bueno Excelente               │              │
│          │                                                         │              │
│          │  ¿Qué tan rápida fue la resolución?                    │              │
│          │                                                         │              │
│          │       ☆      ☆      ★      ★      ★                   │              │
│          │       1      2      3      4      5                    │              │
│          │   Muy lenta        Adecuada       Muy rápida           │              │
│          │                                                         │              │
│          │  ¿El problema quedó completamente resuelto?            │              │
│          │                                                         │              │
│          │       ○ Sí, completamente                              │              │
│          │       ○ Parcialmente                                    │              │
│          │       ○ No estoy seguro aún                            │              │
│          │                                                         │              │
│          │  Comentarios adicionales (opcional):                    │              │
│          │  ┌───────────────────────────────────────────────────┐ │              │
│          │  │ Ana fue muy amable y resolvió rápido. Gracias.   │ │              │
│          │  │                                                   │ │              │
│          │  └───────────────────────────────────────────────────┘ │              │
│          │                                                         │              │
│          │           [ Omitir ]    [ ✅ Enviar encuesta ]          │              │
│          │                                                         │              │
│          └─────────────────────────────────────────────────────────┘              │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-20: Centro de Notificaciones del Usuario

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI                    Inicio │ Mis Tickets │ Nuevo          María G. | ⚙️ │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  🔔 Notificaciones (5 sin leer)                    [ Marcar todo como leído ] │
│  ──────────────────────────────                                                │
│                                                                                │
│  Filtro:  [ Todas ]  [ Sin leer ]  [ Menciones ]                              │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  🔵 HOY 14:35                                                           │  │
│  │  💬 Carlos Ramírez comentó en PGI-2026-000142                           │  │
│  │  "Hola María, estoy revisando el caso. ¿Podrías decirme si otros..."   │  │
│  │                                                              [ Ver → ]  │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │  🔵 HOY 12:05                                                           │  │
│  │  👤 PGI-2026-000142 fue asignado a Carlos Ramírez                       │  │
│  │  Tu ticket "Error autenticación portal web" ya tiene agente.            │  │
│  │                                                              [ Ver → ]  │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │  🔵 HOY 10:20                                                           │  │
│  │  🎫 PGI-2026-000142 creado exitosamente                                │  │
│  │  Confirmación de tu nueva incidencia.                                    │  │
│  │                                                              [ Ver → ]  │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │  ○ AYER 16:00                                                           │  │
│  │  ✅ PGI-2026-000138 fue marcado como RESUELTO                          │  │
│  │  Ana Torres resolvió "Impresora HP-4050 no imprime".                    │  │
│  │  Por favor confirma o reabre.                         [ Confirmar → ]   │  │
│  ├──────────────────────────────────────────────────────────────────────────┤  │
│  │  ○ AYER 09:15                                                           │  │
│  │  ⏳ PGI-2026-000140 — Se solicita tu información                       │  │
│  │  Pedro Salinas necesita más detalles para continuar.                     │  │
│  │                                                          [ Responder → ]│  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ─── Más antiguas ──────────────────                                           │
│  ...ver más notificaciones                                                     │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-21: Mi Perfil y Preferencias de Notificación

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI                    Inicio │ Mis Tickets │ Nuevo          María G. | ⚙️ │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Mi Perfil                                                                     │
│  ─────────                                                                     │
│                                                                                │
│  ┌───────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │                           │  │  DATOS PERSONALES                       │  │
│  │     ┌──────────────┐      │  │  ─────────────────                      │  │
│  │     │              │      │  │                                          │  │
│  │     │   👤 Avatar  │      │  │  Nombre:     María                      │  │
│  │     │              │      │  │  Apellido:   García López               │  │
│  │     └──────────────┘      │  │  Email:      maria.garcia@empresa.com   │  │
│  │     [ Cambiar foto ]      │  │  Teléfono:   +52 81 1234 5678          │  │
│  │                           │  │  Depto:      Finanzas                   │  │
│  │  María García López       │  │  Rol:        Reporter (solo lectura)    │  │
│  │  Reporter                 │  │                                          │  │
│  │  Finanzas                 │  │              [ ✏️ Editar datos ]         │  │
│  │                           │  │                                          │  │
│  │  Miembro desde:           │  │  ─────────────────────────────────────  │  │
│  │  15/01/2026               │  │                                          │  │
│  │                           │  │  CAMBIAR CONTRASEÑA                     │  │
│  │  Tickets totales: 18      │  │  ─────────────────────                  │  │
│  │  Tickets activos: 5       │  │                                          │  │
│  │                           │  │  Contraseña actual:  [••••••••••     ]  │  │
│  └───────────────────────────┘  │  Nueva contraseña:   [               ]  │  │
│                                  │  Confirmar nueva:    [               ]  │  │
│                                  │                                          │  │
│                                  │              [ 🔑 Cambiar contraseña ]  │  │
│                                  └──────────────────────────────────────────┘  │
│                                                                                │
│  ─── PREFERENCIAS DE NOTIFICACIÓN ──────────────────────────────────────────  │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  Evento                          │  Email  │  Web (push)  │  Ambos     │  │
│  │  ────────────────────────────────┼─────────┼──────────────┼────────────│  │
│  │  Mi ticket fue asignado          │  ○      │  ○           │  ●         │  │
│  │  Cambio de estado en mi ticket   │  ○      │  ○           │  ●         │  │
│  │  Nuevo comentario en mi ticket   │  ○      │  ○           │  ●         │  │
│  │  Mi ticket fue resuelto          │  ●      │  ○           │  ○         │  │
│  │  Solicitan mi información        │  ○      │  ○           │  ●         │  │
│  │  Resumen semanal                 │  ●      │  ○           │  ○         │  │
│  │                                                                          │  │
│  │  🔔 Notificaciones push del navegador:  [ ✅ Habilitadas ]              │  │
│  │                                                                          │  │
│  │                                              [ Guardar preferencias ]   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

### 17.3 PANEL DE AGENTES / ADMINISTRACIÓN

---

#### WF-30: Dashboard Operativo del Agente

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI  │ Dashboard │ Cola │ Reportes │ Sistemas │ Equipo │ Admin    Carlos R.│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Buenos días, Carlos 👋            Hoy: 13 de Abril, 2026       🔔 3 alertas   │
│                                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ 🎫 47       │  │ ⚠️ 12       │  │ 🕐 4.2h     │  │ ✅ 94.3%    │            │
│  │ Abiertos    │  │ Sin asignar │  │ MTTR hoy    │  │ SLA cumpl.  │            │
│  │ ▲ +5 hoy    │  │ ▼ -3 hoy    │  │ ▼ -0.3h     │  │ ▲ +1.2%     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                                  │
│  ┌──────────────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │  TICKETS POR ESTADO                  │  │  🔴 ALERTAS SLA                  │  │
│  │  ──────────────────                  │  │  ────────────                     │  │
│  │                                      │  │                                   │  │
│  │   ████████████░░░░  Open (18)        │  │  ⚡ PGI-2026-000138              │  │
│  │   ██████████░░░░░░  Assigned (14)    │  │     Portal Web · P1 · Vence 1h  │  │
│  │   ████████░░░░░░░░  In Progress (8)  │  │     Asignado: Laura Méndez      │  │
│  │   ████░░░░░░░░░░░░  Awaiting (4)     │  │     [ Ver ticket → ]            │  │
│  │   ██████░░░░░░░░░░  Resolved (3)     │  │                                   │  │
│  │                                      │  │  ⚠️ PGI-2026-000141              │  │
│  │  ┌────────────────────────────────┐  │  │     ERP SAP · P2 · Vence 3h     │  │
│  │  │  📈 TENDENCIA SEMANAL         │  │  │     Asignado: Pedro Salinas      │  │
│  │  │                               │  │  │     [ Ver ticket → ]            │  │
│  │  │   50 ┤      ╭──╮             │  │  │                                   │  │
│  │  │   40 ┤  ╭──╯    ╰──╮        │  │  │  ⚠️ PGI-2026-000139              │  │
│  │  │   30 ┤──╯           ╰──╮    │  │  │     Red/VPN · P2 · Vence 5h     │  │
│  │  │   20 ┤                  ╰── │  │  │     ⚠️ Sin asignar               │  │
│  │  │   10 ┤                      │  │  │     [ Asignar → ]               │  │
│  │  │      └──┬──┬──┬──┬──┬──┬──  │  │  │                                   │  │
│  │  │        Lu Ma Mi Ju Vi Sa Do  │  │  └──────────────────────────────────┘  │
│  │  │                               │  │                                        │
│  │  │  ── Creados  ── Cerrados     │  │                                        │
│  │  └────────────────────────────────┘  │                                        │
│  └──────────────────────────────────────┘                                        │
│                                                                                  │
│  ┌──────────────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │  CARGA POR AGENTE                    │  │  ACTIVIDAD RECIENTE              │  │
│  │  ────────────────                    │  │  ──────────────────              │  │
│  │                                      │  │                                   │  │
│  │  Carlos R.  ██████████████░░  10     │  │  14:35  Carlos comentó 000142   │  │
│  │  Laura M.   ████████████░░░░   8     │  │  14:32  Laura cerró 000137      │  │
│  │  Pedro S.   ██████████░░░░░░   6     │  │  14:15  Nuevo: PGI-000142       │  │
│  │  Ana T.     ██████░░░░░░░░░░   4     │  │  13:50  Pedro → Esp. Info       │  │
│  │  Juan P.    ████░░░░░░░░░░░░   2     │  │  13:30  Ana resolvió 000136     │  │
│  │                                      │  │  13:15  Asignado: 000141→Pedro  │  │
│  │  Promedio: 6.0  │  Capacidad: 8     │  │  12:45  Nuevo: PGI-000141       │  │
│  │                                      │  │  12:00  Asignado: 000142→Carlos │  │
│  └──────────────────────────────────────┘  │                                   │  │
│                                            │  [ Ver toda la actividad → ]     │  │
│                                            └──────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-31: Cola de Incidencias (Tabla Avanzada)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI  │ Dashboard │ Cola │ Reportes │ Sistemas │ Equipo │ Admin    Carlos R.│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Cola de Incidencias                  🔍 Buscar tickets...       [ ⚙️ Filtros ] │
│  ──────────────────                                                              │
│                                                                                  │
│  Vistas:  [ ⭐ Mis tickets ]  [ Sin asignar ]  [ P1/P2 activos ]  [ + Nueva ] │
│                                                                                  │
│  Estado: [Todos    ▼]  Prioridad: [Todos ▼]  Sistema: [Todos ▼]  Agente: [Todos▼]│
│  Fecha desde: [         ]  Fecha hasta: [         ]       [ Limpiar filtros ]   │
│                                                                                  │
│  ☐ │ Ticket           │ Título                       │ Prior│ Estado      │ SLA  │ Agente        │ Actividad    │
│  ──┼──────────────────┼──────────────────────────────┼──────┼─────────────┼──────┼───────────────┼──────────────│
│  ☐ │ PGI-2026-000142  │ Error autenticación portal   │🔴 P1 │ 🔵 Progreso │ ⚡1h │ Carlos R.     │ Hace 2h      │
│    │                   │ ● Carlos está editando       │      │             │      │               │              │
│  ──┼──────────────────┼──────────────────────────────┼──────┼─────────────┼──────┼───────────────┼──────────────│
│  ☐ │ PGI-2026-000141  │ Reporte SAP no genera PDF    │🟠 P2 │ 🟡 Asignado │ ⚠️3h │ Pedro S.      │ Hace 3h      │
│  ──┼──────────────────┼──────────────────────────────┼──────┼─────────────┼──────┼───────────────┼──────────────│
│  ☐ │ PGI-2026-000140  │ VPN desconecta intermitente  │🟠 P2 │ ⏳ Esp.Info │  5h  │ Pedro S.      │ Hace 5h      │
│  ──┼──────────────────┼──────────────────────────────┼──────┼─────────────┼──────┼───────────────┼──────────────│
│  ☐ │ PGI-2026-000139  │ Lentitud en red piso 3       │🟡 P3 │ ⚪ Abierto  │ 12h  │ ⚠️ Sin asignar│ Hace 6h      │
│  ──┼──────────────────┼──────────────────────────────┼──────┼─────────────┼──────┼───────────────┼──────────────│
│  ☐ │ PGI-2026-000138  │ Impresora HP-4050 atascada   │🟢 P4 │ ✅ Resuelto │  OK  │ Ana T.        │ Hace 1d      │
│  ──┼──────────────────┼──────────────────────────────┼──────┼─────────────┼──────┼───────────────┼──────────────│
│  ☐ │ PGI-2026-000137  │ Teams no carga en Chrome     │🟡 P3 │ 🟢 Cerrado  │  OK  │ Laura M.      │ Hace 1d      │
│  ──┼──────────────────┼──────────────────────────────┼──────┼─────────────┼──────┼───────────────┼──────────────│
│  ☐ │ PGI-2026-000136  │ Error al imprimir etiquetas  │🟢 P4 │ 🟢 Cerrado  │  OK  │ Ana T.        │ Hace 2d      │
│  ──┼──────────────────┼──────────────────────────────┼──────┼─────────────┼──────┼───────────────┼──────────────│
│                                                                                  │
│  ☑ 0 seleccionados   Acciones: [ Asignar a... ] [ Prioridad ] [ Estado ]        │
│                                                                                  │
│  Mostrando 1-20 de 47 incidencias     [ ← ]  1  2  3  [ → ]     Auto-refresh: ✅│
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-32: Detalle de Incidencia — Vista Agente

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI  │ Dashboard │ Cola │ Reportes │ Sistemas │ Equipo │ Admin    Carlos R.│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ← Volver a la cola                                                     v.5     │
│                                                                                  │
│  ┌───────────────────────────────────────────────┐  ┌─────────────────────────┐  │
│  │  PGI-2026-000142                              │  │  ACCIONES               │  │
│  │  Error de autenticación al intentar           │  │  ─────────              │  │
│  │  acceder al portal web                        │  │                         │  │
│  │                                               │  │  Estado:                │  │
│  │  Reporter: María García (Finanzas)            │  │  ┌───────────────────┐  │  │
│  │  Creado: 13/04/2026 10:15                     │  │  │ En Progreso     ▼│  │  │
│  │                                               │  │  └───────────────────┘  │  │
│  │  SLA:                                         │  │                         │  │
│  │  Respuesta: ✅ Cumplido (1h 50m / 2h)        │  │  Prioridad:             │  │
│  │  Resolución:                                  │  │  ┌───────────────────┐  │  │
│  │  ┌────────────────────────────────────────┐   │  │  │ 🔴 Alta (P2)    ▼│  │  │
│  │  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  75%      │   │  │  └───────────────────┘  │  │
│  │  └────────────────────────────────────────┘   │  │                         │  │
│  │  ⏱️ 6h de 24h restantes                       │  │  Asignado a:            │  │
│  │                                               │  │  ┌───────────────────┐  │  │
│  │  ─── TIMELINE COMPLETO ───────────────────    │  │  │ Carlos Ramírez  ▼│  │  │
│  │                                               │  │  └───────────────────┘  │  │
│  │  ● 14:30  Carlos Ramírez                     │  │                         │  │
│  │  │  Estado: Asignado → En Progreso            │  │  Sistema:               │  │
│  │  │  💬 "Inicio de diagnóstico..."            │  │  🌐 Portal Web Corp.   │  │
│  │  │                                            │  │                         │  │
│  │  ● 12:05  Sistema (auto)                     │  │  Categoría:             │  │
│  │  │  Asignado a Carlos Ramírez                 │  │  Acceso / Login         │  │
│  │  │                                            │  │                         │  │
│  │  ● 10:20  Sistema (auto)                     │  │  [ ✅ Resolver ]        │  │
│  │  │  Email confirmación enviado                │  │  [ ⬆️ Escalar ]         │  │
│  │  │                                            │  │  [ 🔀 Merge ]           │  │
│  │  ● 10:15  María García (Reporter)            │  │                         │  │
│  │  │  Incidencia creada                         │  │  ─── RELACIONADOS ───  │  │
│  │  │  📎 3 adjuntos                             │  │                         │  │
│  │                                               │  │  PGI-000128 (similar)  │  │
│  │  ─── COMENTARIOS ─────────────────────────    │  │  PGI-000099 (similar)  │  │
│  │                                               │  │                         │  │
│  │  Carlos Ramírez · 14:35  (público)           │  │  ─── ADJUNTOS (3) ───  │  │
│  │  ┌──────────────────────────────────────────┐ │  │                         │  │
│  │  │ Hola María, estoy revisando el caso.     │ │  │  📸 error_503.png     │  │
│  │  │ ¿Podrías decirme si otros compañeros...  │ │  │  📸 pantalla.png      │  │
│  │  └──────────────────────────────────────────┘ │  │  📄 console.txt       │  │
│  │                                               │  │                         │  │
│  │  🔒 Carlos Ramírez · 14:40  (INTERNO)        │  │  [ + Adjuntar ]        │  │
│  │  ┌──────────────────────────────────────────┐ │  │                         │  │
│  │  │ ⚠️ NOTA INTERNA (no visible al usuario)  │ │  │  ─── WATCHERS ──────  │  │
│  │  │ Revisé los logs de LDAP. Hay timeout     │ │  │                         │  │
│  │  │ en el AD desde las 09:00. Puede ser el   │ │  │  👤 Carlos R. (agent) │  │
│  │  │ mismo issue que el incidente de marzo.    │ │  │  👤 María G. (report) │  │
│  │  └──────────────────────────────────────────┘ │  │  [ + Añadir watcher ] │  │
│  │                                               │  │                         │  │
│  │  ┌──────────────────────────────────────────┐ │  └─────────────────────────┘  │
│  │  │  Nuevo comentario...                     │ │                                │
│  │  │                                          │ │                                │
│  │  │  Tipo: [ ○ Público  ● Interno ]          │ │                                │
│  │  │                                          │ │                                │
│  │  │  📎 Adjuntar     [ Enviar comentario ]   │ │                                │
│  │  └──────────────────────────────────────────┘ │                                │
│  │                                               │                                │
│  └───────────────────────────────────────────────┘                                │
│                                                                                    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-33: Diálogo de Conflicto de Concurrencia

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                            │  │
│  │  ⚠️ CONFLICTO DETECTADO                                                   │  │
│  │  ─────────────────────                                                     │  │
│  │                                                                            │  │
│  │  Laura Méndez actualizó este ticket (PGI-2026-000142)                     │  │
│  │  mientras lo editabas.                                                     │  │
│  │                                                                            │  │
│  │  ┌───────────────────────────────┐  ┌───────────────────────────────┐     │  │
│  │  │  CAMBIOS DE LAURA (14:32)    │  │  TUS CAMBIOS PENDIENTES      │     │  │
│  │  │  ─────────────────────────   │  │  ─────────────────────────   │     │  │
│  │  │                               │  │                               │     │  │
│  │  │  • Prioridad:                │  │  • Estado:                    │     │  │
│  │  │    Media → Alta              │  │    Asignado → En Progreso     │     │  │
│  │  │                               │  │                               │     │  │
│  │  │  • Comentario:               │  │  • Comentario:                │     │  │
│  │  │    "Confirmado: afecta a     │  │    "Inicio diagnóstico"       │     │  │
│  │  │     50+ usuarios"            │  │                               │     │  │
│  │  │                               │  │                               │     │  │
│  │  └───────────────────────────────┘  └───────────────────────────────┘     │  │
│  │                                                                            │  │
│  │  ¿Qué deseas hacer?                                                       │  │
│  │                                                                            │  │
│  │  ┌────────────────────────────────────────────────────────────────────┐   │  │
│  │  │  🔄 Recargar ticket (perder mis cambios)                          │   │  │
│  │  │     Ver la versión actualizada por Laura y empezar de nuevo.      │   │  │
│  │  ├────────────────────────────────────────────────────────────────────┤   │  │
│  │  │  💪 Forzar mis cambios (sobre los de Laura)                       │   │  │
│  │  │     Mis cambios se guardarán como nueva versión. Los de Laura     │   │  │
│  │  │     quedarán en el historial.                                     │   │  │
│  │  ├────────────────────────────────────────────────────────────────────┤   │  │
│  │  │  🤝 Fusionar ambos cambios                                        │   │  │
│  │  │     Aplicar prioridad de Laura + mi cambio de estado.             │   │  │
│  │  │     Ambos comentarios se conservan.                               │   │  │
│  │  └────────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                            │  │
│  │                                                         [ Cancelar ]      │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-34: Panel de Escalación

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI  │ Dashboard │ Cola │ Reportes │ Sistemas │ Equipo │ Admin    Carlos R.│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ⬆️ Escalar Incidencia — PGI-2026-000142                                         │
│  ──────────────────────────────────────                                          │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                            │  │
│  │  DATOS DEL TICKET                                                          │  │
│  │  Error de autenticación en portal web                                      │  │
│  │  Prioridad actual: 🔴 Alta (P2)   Sistema: Portal Web Corporativo         │  │
│  │  Agente actual: Carlos Ramírez   Tiempo transcurrido: 4h 15min            │  │
│  │                                                                            │  │
│  │  ─────────────────────────────────────────────────────────────────────     │  │
│  │                                                                            │  │
│  │  Nivel de escalación:                                                      │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │  │
│  │  │ ⬆️ Nivel 2        │  │ ⬆️⬆️ Nivel 3       │  │ 🚨 Gerencia     │         │  │
│  │  │ Supervisor        │  │ Especialista     │  │ Escalación       │         │  │
│  │  │ de Equipo         │  │ Senior / Vendor  │  │ Ejecutiva        │         │  │
│  │  │                   │  │                  │  │                  │         │  │
│  │  │ ● Seleccionado   │  │ ○               │  │ ○               │         │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘         │  │
│  │                                                                            │  │
│  │  Escalar a:                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │  │
│  │  │ Roberto Garza (Supervisor Soporte N2)                              ▼│ │  │
│  │  └──────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                            │  │
│  │  ¿También cambiar prioridad?                                              │  │
│  │  ┌────────────────────────────────────────┐                               │  │
│  │  │ 🔴 Crítica (P1) — Impacto masivo     ▼│                               │  │
│  │  └────────────────────────────────────────┘                               │  │
│  │                                                                            │  │
│  │  Razón de escalación: *                                                    │  │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │  │
│  │  │ El problema de autenticación persiste después de 4 horas de        │ │  │
│  │  │ diagnóstico. Los logs indican un timeout en el AD que podría       │ │  │
│  │  │ requerir intervención a nivel de infraestructura del directorio    │ │  │
│  │  │ activo. Afecta a 50+ usuarios del departamento de Finanzas.       │ │  │
│  │  └──────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                            │  │
│  │  ☑ Notificar al reporter sobre la escalación                              │  │
│  │  ☑ Mantenerme como agente secundario                                      │  │
│  │                                                                            │  │
│  │                           [ Cancelar ]    [ ⬆️ ESCALAR INCIDENCIA ]        │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-35: Gestión de Equipo (Supervisor)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI  │ Dashboard │ Cola │ Reportes │ Sistemas │ Equipo │ Admin   Roberto G.│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Gestión de Equipo                                                               │
│  ─────────────────                                                               │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │  RESUMEN DEL EQUIPO                                                          ││
│  │                                                                              ││
│  │  Agentes activos: 5    Tickets asignados: 30    Capacidad: 40 (75%)         ││
│  │  SLA global equipo: 94.3%    MTTR promedio: 4.2h                            ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────┬──────────┬──────────┬──────────┬──────────┬──────────┬───────────┐ │
│  │ Agente  │ Estado   │ Asignados│ Hoy Cerr.│ SLA %    │ MTTR     │ Acciones  │ │
│  ├─────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────────┤ │
│  │ Carlos  │ 🟢 Online│    10    │    2     │  96.5%   │  3.8h    │ [ Ver ]   │ │
│  │ Ramírez │          │ ████████ │          │          │          │ [Reasignar]│ │
│  ├─────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────────┤ │
│  │ Laura   │ 🟢 Online│     8    │    3     │  97.2%   │  3.2h    │ [ Ver ]   │ │
│  │ Méndez  │          │ ██████░░ │          │          │          │ [Reasignar]│ │
│  ├─────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────────┤ │
│  │ Pedro   │ 🟡 Ocup. │     6    │    1     │  91.0%   │  5.1h    │ [ Ver ]   │ │
│  │ Salinas │          │ ████░░░░ │          │          │          │ [Reasignar]│ │
│  ├─────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────────┤ │
│  │ Ana     │ 🟢 Online│     4    │    2     │  98.0%   │  2.9h    │ [ Ver ]   │ │
│  │ Torres  │          │ ███░░░░░ │          │          │          │ [Reasignar]│ │
│  ├─────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────────┤ │
│  │ Juan    │ 🔴 Ausent│     2    │    0     │  89.5%   │  6.3h    │ [ Ver ]   │ │
│  │ Pérez   │ Vacacion.│ █░░░░░░░ │          │          │          │ [Reasignar]│ │
│  └─────────┴──────────┴──────────┴──────────┴──────────┴──────────┴───────────┘ │
│                                                                                  │
│  [ Reasignación masiva de Juan Pérez → ]                                        │
│                                                                                  │
│  ─── TICKETS SIN ASIGNAR (12) ──────────────────────────────────────────────    │
│                                                                                  │
│  PGI-000139 · Lentitud red piso 3 · 🟡P3 · 6h sin asignar    [ Asignar a ▼ ] │
│  PGI-000143 · Error backup SAP · 🟠P2 · 2h sin asignar        [ Asignar a ▼ ] │
│  PGI-000144 · WiFi piso 5 caído · 🟡P3 · 1h sin asignar       [ Asignar a ▼ ] │
│  ...ver los 12 tickets sin asignar                                               │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-36: Gestión de Sistemas y SLAs

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI  │ Dashboard │ Cola │ Reportes │ Sistemas │ Equipo │ Admin   Roberto G.│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Catálogo de Sistemas Gestionados                          [ + Nuevo Sistema ]  │
│  ────────────────────────────────                                                │
│                                                                                  │
│  🔍 Buscar sistema...       Categoría: [Todas        ▼]  Estado: [Activos  ▼]  │
│                                                                                  │
│  ┌─────────┬──────────┬───────────┬──────────┬──────────┬───────────┬─────────┐ │
│  │ Sistema │ Categoría│ Criticidad│Responsabl│ Tickets  │ SLA Cumpl.│ Acciones│ │
│  │         │          │           │          │ (30 días)│  (30 días)│         │ │
│  ├─────────┼──────────┼───────────┼──────────┼──────────┼───────────┼─────────┤ │
│  │🌐Portal │ Web &    │ 🔴 Alta   │ Carlos R.│   12     │  92.3%    │ [✏️][📊]│ │
│  │ Web     │ Apps     │           │          │ ▲ +3     │  ▼ -2.1%  │         │ │
│  ├─────────┼──────────┼───────────┼──────────┼──────────┼───────────┼─────────┤ │
│  │🏢SAP    │ ERP      │ 🔴 Alta   │ Pedro S. │    8     │  95.0%    │ [✏️][📊]│ │
│  │ S/4HANA │          │           │          │ = 0      │  ▲ +1.5%  │         │ │
│  ├─────────┼──────────┼───────────┼──────────┼──────────┼───────────┼─────────┤ │
│  │📧Exchang│ Comunic. │ 🔴 Alta   │ Laura M. │    5     │  98.0%    │ [✏️][📊]│ │
│  │ e Online│          │           │          │ ▼ -2     │  ▲ +3.0%  │         │ │
│  ├─────────┼──────────┼───────────┼──────────┼──────────┼───────────┼─────────┤ │
│  │📡Red/VPN│ Infraest.│ 🟣Crítica │ Ana T.   │   15     │  88.5%    │ [✏️][📊]│ │
│  │         │          │           │          │ ▲ +7     │  ▼ -5.2%  │ ⚠️       │ │
│  ├─────────┼──────────┼───────────┼──────────┼──────────┼───────────┼─────────┤ │
│  │🗄️Postgr │ Base de  │ 🟣Crítica │ Carlos R.│    3     │  100.0%   │ [✏️][📊]│ │
│  │ eSQL    │ Datos    │           │          │ ▼ -1     │  = 0      │         │ │
│  └─────────┴──────────┴───────────┴──────────┴──────────┴───────────┴─────────┘ │
│                                                                                  │
│  ─── CONFIGURACIÓN SLA: Portal Web Corporativo ─────────────────────────────    │
│  (click en ✏️ para expandir)                                                     │
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │  Prioridad  │ Respuesta (h) │ Resolución (h) │ Escalación (h) │ Activo     ││
│  │  ───────────┼───────────────┼────────────────┼────────────────┼──────────  ││
│  │  🔴 Crítica │ [ 1  ]        │ [ 8  ]         │ [ 2  ]         │ ✅          ││
│  │  🟠 Alta    │ [ 2  ]        │ [ 24 ]         │ [ 4  ]         │ ✅          ││
│  │  🟡 Media   │ [ 8  ]        │ [ 72 ]         │ [ 24 ]         │ ✅          ││
│  │  🟢 Baja    │ [ 48 ]        │ [ 168]         │ [ 72 ]         │ ✅          ││
│  │                                                                              ││
│  │                                            [ Cancelar ] [ Guardar SLAs ]    ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-37: Constructor de Reportes

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI  │ Dashboard │ Cola │ Reportes │ Sistemas │ Equipo │ Admin   Roberto G.│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Reportes                                                                        │
│  ─────────                                                                       │
│                                                                                  │
│  Tabs: [ Prediseñados ] [ Constructor Ad-Hoc ] [ Programados ] [ Historial ]    │
│                        ━━━━━━━━━━━━━━━━━━━━━━                                   │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  CONSTRUCTOR DE REPORTES                                                   │  │
│  │                                                                            │  │
│  │  Tipo de reporte:                                                          │  │
│  │  ┌──────────────────────────────────────────────┐                         │  │
│  │  │ Resumen de incidencias por sistema          ▼│                         │  │
│  │  └──────────────────────────────────────────────┘                         │  │
│  │  Opciones: Resumen por sistema · Por agente · SLA Compliance · Tendencias │  │
│  │            Aging · Satisfacción · Productividad · Personalizado           │  │
│  │                                                                            │  │
│  │  ─── FILTROS ────────────────────────────────────────────────────────     │  │
│  │                                                                            │  │
│  │  Periodo:     [ 01/03/2026 ] a [ 13/04/2026 ]    Presets: [Mes▼]        │  │
│  │  Sistemas:    [ ✅ Todos ] [ Portal Web ] [ SAP ] [ Exchange ] ...        │  │
│  │  Prioridades: [ ✅ Todas ] [ P1 ] [ P2 ] [ P3 ] [ P4 ]                   │  │
│  │  Agentes:     [ ✅ Todos ] [ Carlos ] [ Laura ] [ Pedro ] ...             │  │
│  │  Estados:     [ ✅ Todos ] [ Abiertos ] [ Cerrados ] [ Resueltos ]        │  │
│  │                                                                            │  │
│  │  ─── COLUMNAS A INCLUIR ─────────────────────────────────────────────     │  │
│  │                                                                            │  │
│  │  ☑ Ticket #     ☑ Sistema      ☑ Prioridad     ☑ Estado                  │  │
│  │  ☑ MTTR         ☑ SLA Status   ☐ Reporter       ☑ Agente                 │  │
│  │  ☑ Fecha creado ☑ Fecha cierre ☐ Categoría      ☐ Descripción            │  │
│  │                                                                            │  │
│  │  ─── AGRUPAR POR ────────────────────────────────────────────────────     │  │
│  │                                                                            │  │
│  │  ┌──────────────────────┐  Luego por: ┌──────────────────────┐            │  │
│  │  │ Sistema             ▼│             │ Prioridad           ▼│            │  │
│  │  └──────────────────────┘             └──────────────────────┘            │  │
│  │                                                                            │  │
│  │  ☑ Incluir gráficas    ☑ Incluir resumen ejecutivo    ☑ Incluir totales  │  │
│  │                                                                            │  │
│  │         [ Vista previa ]    [ 📄 Exportar PDF ]    [ 📊 Exportar Excel ]  │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ─── VISTA PREVIA DEL REPORTE ──────────────────────────────────────────────    │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  REPORTE: Resumen de Incidencias por Sistema                               │  │
│  │  Periodo: 01/03/2026 — 13/04/2026                                         │  │
│  │                                                                            │  │
│  │  Sistema          │ Total │ Abiertos │ Cerrados │ SLA % │ MTTR (h)        │  │
│  │  ─────────────────┼───────┼──────────┼──────────┼───────┼────────          │  │
│  │  Portal Web       │  12   │    3     │    9     │ 92.3% │  4.5             │  │
│  │  Red / VPN        │  15   │    5     │   10     │ 88.5% │  5.8             │  │
│  │  SAP S/4HANA      │   8   │    2     │    6     │ 95.0% │  3.9             │  │
│  │  Exchange Online  │   5   │    1     │    4     │ 98.0% │  2.1             │  │
│  │  PostgreSQL       │   3   │    0     │    3     │100.0% │  1.8             │  │
│  │  ─────────────────┼───────┼──────────┼──────────┼───────┼────────          │  │
│  │  TOTAL            │  43   │   11     │   32     │ 94.3% │  4.2             │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-38: Gestión de Usuarios (Admin)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI  │ Dashboard │ Cola │ Reportes │ Sistemas │ Equipo │ Admin     Admin   │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Admin ▸ Gestión de Usuarios                                 [ + Nuevo Usuario ]│
│  ──────────────────────────                                                      │
│                                                                                  │
│  🔍 Buscar usuario...      Rol: [Todos    ▼]  Depto: [Todos    ▼]  Estado: [✅]│
│                                                                                  │
│  ┌──────────┬───────────────────┬──────────┬──────────┬──────────┬────────────┐ │
│  │ Nombre   │ Email             │ Rol      │ Depto.   │ Estado   │ Acciones   │ │
│  ├──────────┼───────────────────┼──────────┼──────────┼──────────┼────────────┤ │
│  │María     │maria.garcia       │ Reporter │ Finanzas │ 🟢 Activo│ [✏️][🔒][🗑]│ │
│  │García    │@empresa.com       │          │          │          │            │ │
│  ├──────────┼───────────────────┼──────────┼──────────┼──────────┼────────────┤ │
│  │Carlos    │carlos.ramirez     │ Agent    │ TI       │ 🟢 Activo│ [✏️][🔒][🗑]│ │
│  │Ramírez   │@empresa.com       │          │ Soporte  │          │            │ │
│  ├──────────┼───────────────────┼──────────┼──────────┼──────────┼────────────┤ │
│  │Roberto   │roberto.garza      │Supervisor│ TI       │ 🟢 Activo│ [✏️][🔒][🗑]│ │
│  │Garza     │@empresa.com       │          │ Soporte  │          │            │ │
│  ├──────────┼───────────────────┼──────────┼──────────┼──────────┼────────────┤ │
│  │Juan      │juan.perez         │ Agent    │ TI       │ 🔴 Inact.│ [✏️][🔒][🗑]│ │
│  │Pérez     │@empresa.com       │          │ Soporte  │Vacaciones│            │ │
│  └──────────┴───────────────────┴──────────┴──────────┴──────────┴────────────┘ │
│                                                                                  │
│  ─── CREAR / EDITAR USUARIO ────────────────────────────────────────────────    │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                            │  │
│  │  Nombre: *       ┌───────────────┐  Apellido: *   ┌───────────────┐       │  │
│  │                  │ Juan          │                │ Pérez         │       │  │
│  │                  └───────────────┘                └───────────────┘       │  │
│  │                                                                            │  │
│  │  Email: *        ┌────────────────────────────────────────────────┐       │  │
│  │                  │ juan.perez@empresa.com                         │       │  │
│  │                  └────────────────────────────────────────────────┘       │  │
│  │                                                                            │  │
│  │  Rol: *          ┌───────────────┐  Departamento: ┌───────────────┐       │  │
│  │                  │ Agent        ▼│                │ TI Soporte   ▼│       │  │
│  │                  └───────────────┘                └───────────────┘       │  │
│  │                                                                            │  │
│  │  Teléfono:       ┌───────────────┐  Estado:       ┌───────────────┐       │  │
│  │                  │ +52 81 5555   │                │ 🟢 Activo    ▼│       │  │
│  │                  └───────────────┘                └───────────────┘       │  │
│  │                                                                            │  │
│  │  ☐ Enviar email de bienvenida con contraseña temporal                     │  │
│  │  ☐ Forzar cambio de contraseña en primer login                            │  │
│  │                                                                            │  │
│  │                                     [ Cancelar ]  [ 💾 Guardar usuario ]  │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-39: Log de Auditoría

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI  │ Dashboard │ Cola │ Reportes │ Sistemas │ Equipo │ Admin   Roberto G.│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Admin ▸ Log de Auditoría                                  [ 📥 Exportar log ] │
│  ────────────────────────                                                        │
│                                                                                  │
│  Filtros:                                                                        │
│  Fecha: [13/04/2026] a [13/04/2026]   Usuario: [Todos ▼]   Tipo: [Todos ▼]    │
│  Recurso: [Todos    ▼]   🔍 Buscar en logs...                                  │
│                                                                                  │
│  ┌──────────┬───────────┬─────────────┬────────────────────────────┬───────────┐ │
│  │ Fecha    │ Usuario   │ Tipo        │ Detalle                    │ IP        │ │
│  ├──────────┼───────────┼─────────────┼────────────────────────────┼───────────┤ │
│  │ 14:40:12 │ Carlos R. │ COMMENT     │ Comentario interno en      │ 192.168.  │ │
│  │          │ (agent)   │ (create)    │ PGI-2026-000142            │ 1.50      │ │
│  ├──────────┼───────────┼─────────────┼────────────────────────────┼───────────┤ │
│  │ 14:35:08 │ Carlos R. │ COMMENT     │ Comentario público en      │ 192.168.  │ │
│  │          │ (agent)   │ (create)    │ PGI-2026-000142            │ 1.50      │ │
│  ├──────────┼───────────┼─────────────┼────────────────────────────┼───────────┤ │
│  │ 14:30:00 │ Carlos R. │ INCIDENT    │ Estado: assigned →         │ 192.168.  │ │
│  │          │ (agent)   │ (update)    │ in_progress  PGI-000142    │ 1.50      │ │
│  ├──────────┼───────────┼─────────────┼────────────────────────────┼───────────┤ │
│  │ 12:05:33 │ Sistema   │ INCIDENT    │ Auto-asignación            │ 10.0.0.1  │ │
│  │          │ (auto)    │ (assign)    │ PGI-000142 → Carlos R.     │           │ │
│  ├──────────┼───────────┼─────────────┼────────────────────────────┼───────────┤ │
│  │ 10:15:22 │ María G.  │ INCIDENT    │ Incidencia creada          │ 192.168.  │ │
│  │          │ (reporter)│ (create)    │ PGI-2026-000142            │ 2.100     │ │
│  ├──────────┼───────────┼─────────────┼────────────────────────────┼───────────┤ │
│  │ 10:15:22 │ María G.  │ ATTACHMENT  │ 3 archivos subidos a       │ 192.168.  │ │
│  │          │ (reporter)│ (upload)    │ PGI-2026-000142 (437 KB)   │ 2.100     │ │
│  ├──────────┼───────────┼─────────────┼────────────────────────────┼───────────┤ │
│  │ 10:15:20 │ María G.  │ AUTH        │ Login exitoso              │ 192.168.  │ │
│  │          │ (reporter)│ (login)     │ Session: sess-abc123       │ 2.100     │ │
│  └──────────┴───────────┴─────────────┴────────────────────────────┴───────────┘ │
│                                                                                  │
│  Mostrando 1-50 de 1,247 eventos       [ ← ]  1  2  3  ...  25  [ → ]          │
│                                                                                  │
│  ℹ️ Los logs de auditoría son inmutables y se retienen por 5 años.               │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-40: Configuración de Plantillas de Correo

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI  │ Dashboard │ Cola │ Reportes │ Sistemas │ Equipo │ Admin     Admin   │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Admin ▸ Plantillas de Correo                                                    │
│  ────────────────────────────                                                    │
│                                                                                  │
│  ┌──────────────────┬──────────────────────┬──────────┬──────────┬────────────┐  │
│  │ Template         │ Asunto               │ Trigger  │ Última   │ Acciones   │  │
│  │                  │                      │          │ edición  │            │  │
│  ├──────────────────┼──────────────────────┼──────────┼──────────┼────────────┤  │
│  │ incident_created │ [PGI] Tu ticket      │ Creación │ 10/04    │ [✏️] [👁️]  │  │
│  │                  │ {{ticket}} fue creado │          │          │ [📧 Test]  │  │
│  ├──────────────────┼──────────────────────┼──────────┼──────────┼────────────┤  │
│  │ incident_assigned│ [PGI] {{ticket}}     │Asignación│ 10/04    │ [✏️] [👁️]  │  │
│  │                  │ asignado a {{agent}} │          │          │ [📧 Test]  │  │
│  ├──────────────────┼──────────────────────┼──────────┼──────────┼────────────┤  │
│  │ status_update    │ [PGI] Actualización  │ Cambio   │ 10/04    │ [✏️] [👁️]  │  │
│  │                  │ en {{ticket}}        │ estado   │          │ [📧 Test]  │  │
│  ├──────────────────┼──────────────────────┼──────────┼──────────┼────────────┤  │
│  │ sla_warning      │ ⚠️ [PGI] SLA próximo │ SLA 80%  │ 10/04    │ [✏️] [👁️]  │  │
│  │                  │ a vencer: {{ticket}} │          │          │ [📧 Test]  │  │
│  ├──────────────────┼──────────────────────┼──────────┼──────────┼────────────┤  │
│  │ sla_breach       │ 🔴 [PGI] SLA vencido │SLA 100%  │ 10/04    │ [✏️] [👁️]  │  │
│  │                  │ {{ticket}}           │          │          │ [📧 Test]  │  │
│  ├──────────────────┼──────────────────────┼──────────┼──────────┼────────────┤  │
│  │ resolution_conf  │ [PGI] {{ticket}}     │Resolución│ 10/04    │ [✏️] [👁️]  │  │
│  │                  │ resuelto — confirma  │          │          │ [📧 Test]  │  │
│  ├──────────────────┼──────────────────────┼──────────┼──────────┼────────────┤  │
│  │ satisfaction     │ [PGI] ¿Cómo fue tu   │ Cierre   │ 10/04    │ [✏️] [👁️]  │  │
│  │                  │ experiencia?         │          │          │ [📧 Test]  │  │
│  ├──────────────────┼──────────────────────┼──────────┼──────────┼────────────┤  │
│  │ weekly_digest    │ [PGI] Resumen semanal│ Lunes AM │ 10/04    │ [✏️] [👁️]  │  │
│  │                  │ de soporte           │          │          │ [📧 Test]  │  │
│  └──────────────────┴──────────────────────┴──────────┴──────────┴────────────┘  │
│                                                                                  │
│  ─── EDITOR DE PLANTILLA: incident_created ─────────────────────────────────    │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  Variables disponibles:                                                    │  │
│  │  {{ticket}} {{title}} {{system}} {{priority}} {{reporter_name}}           │  │
│  │  {{agent_name}} {{sla_deadline}} {{portal_url}} {{date}}                  │  │
│  │                                                                            │  │
│  │  ┌──────────────────────────────────────────────────────────────────────┐ │  │
│  │  │  <h2>🛡️ PGI — Confirmación de incidencia</h2>                      │ │  │
│  │  │  <p>Hola {{reporter_name}},</p>                                    │ │  │
│  │  │  <p>Tu incidencia ha sido registrada exitosamente:</p>             │ │  │
│  │  │  <table>                                                            │ │  │
│  │  │    <tr><td>Ticket:</td><td><b>{{ticket}}</b></td></tr>             │ │  │
│  │  │    <tr><td>Título:</td><td>{{title}}</td></tr>                     │ │  │
│  │  │    <tr><td>Sistema:</td><td>{{system}}</td></tr>                   │ │  │
│  │  │    <tr><td>Prioridad:</td><td>{{priority}}</td></tr>               │ │  │
│  │  │  </table>                                                           │ │  │
│  │  │  <a href="{{portal_url}}">Ver mi ticket en PGI</a>                │ │  │
│  │  └──────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                            │  │
│  │                    [ Cancelar ]  [ 👁️ Preview ]  [ 💾 Guardar plantilla ] │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

#### WF-41: Configuración Global del Sistema (Admin)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🛡️ PGI  │ Dashboard │ Cola │ Reportes │ Sistemas │ Equipo │ Admin     Admin   │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Admin ▸ Configuración Global                                                    │
│  ────────────────────────────                                                    │
│                                                                                  │
│  Tabs: [ General ] [ Seguridad ] [ Email SMTP ] [ Almacenamiento ] [ Backup ]   │
│        ━━━━━━━━━━                                                                │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  CONFIGURACIÓN GENERAL                                                     │  │
│  │                                                                            │  │
│  │  Nombre de la plataforma:                                                  │  │
│  │  ┌───────────────────────────────────────────────┐                        │  │
│  │  │ PGI — Plataforma de Gestión de Incidencias    │                        │  │
│  │  └───────────────────────────────────────────────┘                        │  │
│  │                                                                            │  │
│  │  URL base:                                                                 │  │
│  │  ┌───────────────────────────────────────────────┐                        │  │
│  │  │ https://pgi.empresa.com                       │                        │  │
│  │  └───────────────────────────────────────────────┘                        │  │
│  │                                                                            │  │
│  │  Prefijo de tickets:            Idioma por defecto:                        │  │
│  │  ┌───────────────┐              ┌───────────────┐                         │  │
│  │  │ PGI           │              │ Español      ▼│                         │  │
│  │  └───────────────┘              └───────────────┘                         │  │
│  │                                                                            │  │
│  │  Zona horaria:                  Formato de fecha:                          │  │
│  │  ┌───────────────────────┐      ┌───────────────┐                         │  │
│  │  │ America/Monterrey   ▼│      │ DD/MM/YYYY   ▼│                         │  │
│  │  └───────────────────────┘      └───────────────┘                         │  │
│  │                                                                            │  │
│  │  ─── COMPORTAMIENTO ──────────────────────────────────────────            │  │
│  │                                                                            │  │
│  │  Auto-cierre de tickets resueltos sin confirmación:                        │  │
│  │  ┌─────────┐ días (0 = deshabilitado)                                     │  │
│  │  │ 5       │                                                              │  │
│  │  └─────────┘                                                              │  │
│  │                                                                            │  │
│  │  Permitir reapertura después de cierre:                                    │  │
│  │  ┌─────────┐ días (0 = ilimitado)                                         │  │
│  │  │ 30      │                                                              │  │
│  │  └─────────┘                                                              │  │
│  │                                                                            │  │
│  │  ☑ Habilitar sugerencia de tickets duplicados                             │  │
│  │  ☑ Habilitar encuesta de satisfacción post-cierre                         │  │
│  │  ☑ Habilitar notificaciones push del navegador                            │  │
│  │  ☐ Modo mantenimiento (desactivar acceso a reporters)                     │  │
│  │                                                                            │  │
│  │                                            [ Restaurar defaults ]         │  │
│  │                                            [ 💾 Guardar configuración ]    │  │
│  │                                                                            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 17.4 Índice Maestro de Wireframes

| ID | Pantalla | Interfaz | Rol Mínimo |
|----|---------|----------|-----------|
| **WF-00** | Login | Compartida | Público |
| **WF-01** | Recuperación de Contraseña | Compartida | Público |
| **WF-02** | Restablecer Contraseña | Compartida | Público |
| **WF-10** | Dashboard Personal del Usuario | Portal Usuario | Reporter |
| **WF-11** | Crear Incidencia — Paso 1: Sistema | Portal Usuario | Reporter |
| **WF-12** | Crear Incidencia — Paso 2: Descripción | Portal Usuario | Reporter |
| **WF-13** | Crear Incidencia — Paso 3: Evidencia | Portal Usuario | Reporter |
| **WF-14** | Crear Incidencia — Paso 4: Confirmar | Portal Usuario | Reporter |
| **WF-15** | Confirmación de Envío Exitoso | Portal Usuario | Reporter |
| **WF-16** | Mis Incidencias — Lista Completa | Portal Usuario | Reporter |
| **WF-17** | Detalle de Incidencia con Timeline | Portal Usuario | Reporter |
| **WF-18** | Confirmar Resolución / Reabrir | Portal Usuario | Reporter |
| **WF-19** | Encuesta de Satisfacción | Portal Usuario | Reporter |
| **WF-20** | Centro de Notificaciones | Portal Usuario | Reporter |
| **WF-21** | Mi Perfil y Preferencias | Portal Usuario | Reporter |
| **WF-30** | Dashboard Operativo | Panel Agentes | Agent |
| **WF-31** | Cola de Incidencias (Tabla) | Panel Agentes | Agent |
| **WF-32** | Detalle de Incidencia (Vista Agente) | Panel Agentes | Agent |
| **WF-33** | Diálogo de Conflicto de Concurrencia | Panel Agentes | Agent |
| **WF-34** | Panel de Escalación | Panel Agentes | Agent |
| **WF-35** | Gestión de Equipo | Panel Agentes | Supervisor |
| **WF-36** | Gestión de Sistemas y SLAs | Panel Agentes | Supervisor |
| **WF-37** | Constructor de Reportes | Panel Agentes | Supervisor |
| **WF-38** | Gestión de Usuarios | Panel Agentes | Admin |
| **WF-39** | Log de Auditoría | Panel Agentes | Supervisor |
| **WF-40** | Plantillas de Correo | Panel Agentes | Admin |
| **WF-41** | Configuración Global | Panel Agentes | Admin |

> **Total: 27 wireframes** cubriendo todas las pantallas de la aplicación.

---

## 18. Historias de Usuario

### 18.1 Épica: Gestión de Incidencias (Reporter)

| ID | Historia | Criterios de Aceptación |
|----|---------|------------------------|
| **US-001** | Como **usuario**, quiero **crear una nueva incidencia** seleccionando el sistema afectado, para que el equipo de soporte atienda mi problema. | Wizard de 4 pasos completo. Ticket generado con número único. Email de confirmación enviado. |
| **US-002** | Como **usuario**, quiero **adjuntar capturas de pantalla y archivos** arrastrándolos o pegándolos del portapapeles, para mostrar evidencia del problema fácilmente. | Drag & drop funcional. Ctrl+V pega screenshot. Preview de imágenes. Max 25MB. Progress bar visible. |
| **US-003** | Como **usuario**, quiero **ver el historial completo de mi incidencia** como un timeline visual, para entender qué ha pasado con mi ticket en cada momento. | Timeline cronológico con todos los eventos. Cada entrada muestra actor, acción, timestamp. Scroll infinito. |
| **US-004** | Como **usuario**, quiero **agregar comentarios a mi incidencia** y recibir notificaciones cuando me respondan, para mantener comunicación con el agente. | Comentarios con texto rico. Notificación email + web al recibir respuesta. Indicador de "leído". |
| **US-005** | Como **usuario**, quiero **confirmar o reabrir una incidencia resuelta**, para garantizar que el problema está verdaderamente solucionado. | Botones de confirmar/reabrir visibles al resolverse. Reabrir requiere comentario obligatorio. |
| **US-006** | Como **usuario**, quiero **buscar y filtrar mis incidencias** por estado, fecha y sistema, para encontrar rápidamente un ticket específico. | Filtros combinables. Búsqueda por texto libre. Resultados instantáneos (< 300ms). |

### 18.2 Épica: Gestión de Incidencias (Agente)

| ID | Historia | Criterios de Aceptación |
|----|---------|------------------------|
| **US-010** | Como **agente**, quiero **ver una cola priorizada de incidencias** con indicadores visuales de SLA, para atender primero lo más urgente. | Cola ordenable por SLA restante. Colores de semáforo. Badge de "sin asignar". Auto-refresh. |
| **US-011** | Como **agente**, quiero **ver si otro agente está editando un ticket** antes de modificarlo, para evitar conflictos de edición. | Indicador visual de "usuario editando" en tiempo real. Lock expira a los 2min. Diálogo de conflicto si se intenta editar. |
| **US-012** | Como **agente**, quiero **cambiar el estado de una incidencia** siguiendo el flujo definido, con validaciones que me impidan transiciones incorrectas. | Solo se muestran estados válidos según la máquina de estados. Transición a "resuelto" requiere comentario. Tracking automático. |
| **US-013** | Como **agente**, quiero **escribir notas internas** visibles solo para el equipo de soporte, para documentar hallazgos sin que el usuario los vea. | Toggle "Interno/Público" al comentar. Comentarios internos con fondo diferenciado. No visibles en portal de usuario. |
| **US-014** | Como **agente**, quiero **recibir alertas cuando un SLA está por vencer**, para tomar acción preventiva y evitar incumplimientos. | Alerta a 80% del tiempo. Alerta visual en dashboard + email. Badge de cuenta en el icono de campana. |
| **US-015** | Como **agente**, quiero **realizar acciones batch** sobre múltiples tickets (asignar, cambiar prioridad), para gestionar volúmenes altos eficientemente. | Checkbox de selección múltiple. Acciones: asignar, cambiar prioridad, cambiar estado. Confirmación antes de ejecutar. |

### 18.3 Épica: Reportería y Analítica

| ID | Historia | Criterios de Aceptación |
|----|---------|------------------------|
| **US-020** | Como **supervisor**, quiero **un dashboard en tiempo real** con KPIs de tickets abiertos, SLA y carga por agente, para monitorear la operación. | Actualización cada 30s vía WebSocket. KPIs: tickets abiertos, SLA%, resolución promedio, backlog. |
| **US-021** | Como **supervisor**, quiero **generar reportes de cumplimiento de SLA** exportables a PDF y Excel, para presentar a la dirección. | Filtros de fecha, sistema, prioridad. Exportación 1-click a PDF/Excel. |
| **US-022** | Como **supervisor**, quiero **ver métricas de productividad por agente**, para identificar oportunidades de mejora y redistribuir carga. | Métricas: tickets resueltos, tiempo promedio, SLA%. Comparativa entre agentes. |
| **US-023** | Como **supervisor**, quiero **programar el envío automático de reportes**, para que la dirección reciba información sin solicitarla. | Configurar frecuencia. Seleccionar reporte y destinatarios. Formato PDF adjunto. |

### 18.4 Épica: Colaboración y Concurrencia

| ID | Historia | Criterios de Aceptación |
|----|---------|------------------------|
| **US-030** | Como **agente**, quiero **ver comentarios nuevos en tiempo real** sin recargar la página, para responder rápidamente al usuario. | Comentario aparece instantáneamente vía WebSocket. Sonido/badge de notificación. |
| **US-031** | Como **agente**, quiero **que el sistema me avise si mis cambios entran en conflicto** con los de otro agente, presentándome opciones claras para resolver el conflicto. | Diálogo muestra cambios del otro vs. los míos. Opciones: recargar, forzar, fusionar. |
| **US-032** | Como **usuario**, quiero **recibir notificaciones push en mi navegador** cuando haya actualizaciones en mis tickets. | Solicitud de permisos push al login. Click lleva directo al ticket. |

---

## 19. Plan de Despliegue

### 19.1 Entornos

| Entorno | Propósito | Base de Datos | Servicios auxiliares | Datos |
|---------|-----------|---------------|----------------------|-------|
| **QAS** | Pruebas, validación funcional y demostraciones a usuarios | PostgreSQL dedicado | Redis, SMTP y storage no productivos | Datos ficticios o anonimizados |
| **Production** | Operación real | PostgreSQL principal + réplica opcional | Redis, SMTP real, storage persistente | Datos reales |

### 19.1.1 Entornos visibles para usuarios desde el login

Para la operación diaria y las validaciones funcionales se habilitarán dos accesos claramente diferenciados:

| Entorno visible | Uso | URL sugerida | Base de datos | Identificación en login |
|-----------------|-----|--------------|---------------|-------------------------|
| **QAS** | Pruebas guiadas, validación con usuarios y demostraciones | `https://qas.pgi.midominio.com` | Dataset ficticio o anonimizado | Badge `QAS`, banner de advertencia y color distintivo |
| **Producción** | Operación real de la mesa de servicio | `https://pgi.midominio.com` | Datos reales | Badge `PROD`, estilo institucional y mensaje de acceso oficial |

### 19.1.2 Reglas funcionales del login por entorno

- El formulario de login debe ser el mismo en ambos entornos para no cambiar la experiencia del usuario.
- La diferencia visual debe estar en el encabezado, badge, color y mensaje contextual.
- El entorno `QAS` no debe conectarse a correos, datos ni adjuntos de producción.
- El entorno `Producción` debe ocultar cuentas de prueba y usar solo servicios reales.
- Ambos entornos deben registrar auditoría de login y cerrar sesiones inválidas de forma consistente.

### 19.1.3 Mensajería sugerida en la pantalla de acceso

#### QAS

> Ambiente de pruebas y validación. La información aquí mostrada no corresponde a operación real.

#### Producción

> Acceso oficial a la Plataforma de Gestión de Incidencias.

### 19.2 Estrategia sin Docker

PGI se desplegará como una aplicación web compuesta por:

1. **Frontend web** en `Next.js`, ejecutado como proceso Node.js.
2. **Backend API** en `NestJS`, ejecutado como proceso Node.js independiente.
3. **PostgreSQL** instalado como servicio del sistema.
4. **Redis** como servicio opcional pero recomendado para colas, caché y eventos.
5. **Almacenamiento de adjuntos** en una de estas dos modalidades:
   - **MVP/local:** filesystem local (`/storage/attachments` o `C:\pgi\storage\attachments`).
   - **Escalable:** MinIO o S3-compatible instalado fuera de Docker.

### 19.3 Requisitos de instalación

| Componente | Versión recomendada | Obligatorio | Observaciones |
|------------|---------------------|-------------|---------------|
| **Node.js** | 20 LTS | Sí | Runtime para frontend y backend |
| **npm / pnpm** | pnpm 9+ o npm 10+ | Sí | Gestor de dependencias |
| **PostgreSQL** | 16+ | Sí | Base principal de la plataforma |
| **Redis** | 7+ | Recomendado | Necesario para colas, caché y tiempo real robusto |
| **Nginx** | 1.24+ | Recomendado | Reverse proxy y terminación TLS |
| **PM2 / systemd / NSSM** | Última estable | Sí | Gestión de procesos según sistema operativo |
| **SMTP accesible** | Cualquiera | Sí | Para notificaciones y recuperación de contraseña |

### 19.4 Estructura objetivo del proyecto

```text
pgi/
├── frontend/              # Next.js - Portal reporter + panel de agentes
│   ├── public/
│   │   ├── images/
│   │   ├── icons/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── app/           # App Router
│   │   │   ├── (auth)/
│   │   │   ├── (portal)/
│   │   │   ├── (admin)/
│   │   │   ├── api/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── forms/
│   │   │   ├── tables/
│   │   │   ├── charts/
│   │   │   └── incidents/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── incidents/
│   │   │   ├── comments/
│   │   │   ├── attachments/
│   │   │   ├── dashboard/
│   │   │   ├── systems/
│   │   │   ├── users/
│   │   │   └── notifications/
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── socket/
│   │   │   ├── validators/
│   │   │   └── utils/
│   │   ├── hooks/
│   │   ├── store/
│   │   ├── types/
│   │   └── config/
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── .env.local
│   ├── next.config.js
│   ├── package.json
│   └── tsconfig.json
├── backend/               # NestJS - API, reglas de negocio y tiempo real
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   ├── dto/
│   │   │   ├── enums/
│   │   │   ├── exceptions/
│   │   │   ├── filters/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── middleware/
│   │   │   ├── pipes/
│   │   │   └── utils/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── incidents/
│   │   │   ├── tracking/
│   │   │   ├── comments/
│   │   │   ├── attachments/
│   │   │   ├── systems/
│   │   │   ├── notifications/
│   │   │   ├── sla/
│   │   │   ├── reports/
│   │   │   ├── dashboard/
│   │   │   ├── audit/
│   │   │   └── health/
│   │   ├── jobs/
│   │   ├── gateways/
│   │   └── templates/
│   │       └── mail/
│   ├── test/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── .env
│   ├── nest-cli.json
│   ├── package.json
│   └── tsconfig.json
├── db/
│   ├── scripts/          # SQL auxiliares, backups, restauración, soporte
│   ├── seeds/
│   ├── backups/
│   └── docs/
├── storage/
│   └── attachments/
│       ├── temp/
│       ├── incidents/
│       └── exports/
├── nginx/
│   ├── dev/
│   └── prod/
├── scripts/
│   ├── setup/
│   ├── deploy/
│   ├── backup/
│   └── maintenance/
├── docs/
│   ├── arquitectura/
│   ├── api/
│   ├── ui-ux/
│   ├── casos-de-uso/
│   └── operaciones/
├── .github/
│   └── workflows/
├── .env
├── .env.example
└── README.md
```

### 19.4.1 Criterio de organización

- `frontend/` contiene toda la experiencia web y debe organizarse por dominios funcionales.
- `backend/` concentra API, reglas de negocio, seguridad, sockets, jobs y plantillas de correo.
- `db/` agrupa artefactos operativos de base de datos que no pertenecen directamente al ORM.
- `storage/` guarda adjuntos, temporales y archivos exportados.
- `docs/` conserva definiciones funcionales, técnicas y operativas del proyecto.
- `scripts/` centraliza automatizaciones para instalación, despliegue, respaldos y mantenimiento.

### 19.4.2 Convención recomendada por módulo backend

Cada módulo de `backend/src/modules/` debe mantener una estructura homogénea:

```text
incidents/
├── dto/
├── entities/
├── incidents.controller.ts
├── incidents.service.ts
├── incidents.repository.ts
├── incidents.gateway.ts         # solo si aplica tiempo real
├── incidents.constants.ts
├── incidents.mapper.ts
├── incidents.module.ts
└── tests/
```

### 19.4.3 Convención recomendada por feature frontend

Cada feature en `frontend/src/features/` debe concentrar sus piezas reutilizables:

```text
incidents/
├── components/
├── hooks/
├── services/
├── schemas/
├── types/
├── utils/
└── index.ts
```

### 19.5 Configuración local sin contenedores

#### Backend (`.env`)

```env
NODE_ENV=qas
APP_NAME=PGI
APP_ENV=qas
APP_DISPLAY_ENV=QAS
APP_PORT=3001
APP_URL=https://qas.pgi.midominio.com
FRONTEND_URL=https://qas.pgi.midominio.com

DATABASE_URL=postgresql://pgi:PASSWORD@localhost:5432/pgi_db
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

REDIS_URL=redis://:PASSWORD@localhost:6379
REDIS_ENABLED=true

JWT_SECRET=change-this-secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=soporte@example.com
SMTP_PASS=smtp-password
SMTP_FROM="PGI <soporte@example.com>"

STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./storage/attachments
SIGNED_URL_TTL_MINUTES=15

MAX_FILE_SIZE=26214400
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
```

#### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_APP_NAME=PGI
NEXT_PUBLIC_APP_ENV=qas
NEXT_PUBLIC_APP_ENV_LABEL=QAS
NEXT_PUBLIC_API_URL=https://qas.pgi.midominio.com/api
NEXT_PUBLIC_WS_URL=wss://qas.pgi.midominio.com/ws
```

#### Variables sugeridas para producción

```env
APP_NAME=PGI
APP_ENV=production
APP_DISPLAY_ENV=PROD
APP_URL=https://pgi.midominio.com
FRONTEND_URL=https://pgi.midominio.com
```

```env
NEXT_PUBLIC_APP_NAME=PGI
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_ENV_LABEL=PROD
NEXT_PUBLIC_API_URL=https://pgi.midominio.com/api
NEXT_PUBLIC_WS_URL=wss://pgi.midominio.com/ws
```

### 19.6 Puesta en marcha local

#### Base de datos

```sql
CREATE DATABASE pgi_db;
CREATE USER pgi WITH PASSWORD 'PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE pgi_db TO pgi;
```

#### Orden de arranque

```bash
# 1. Backend
cd backend
pnpm install
pnpm prisma migrate deploy
pnpm prisma db seed
pnpm start:dev

# 2. Frontend
cd frontend
pnpm install
pnpm dev
```

#### Servicios auxiliares

- `Redis`: arrancar como servicio del sistema antes del backend si `REDIS_ENABLED=true`.
- `Storage local`: crear la carpeta `storage/attachments` con permisos de lectura y escritura para la aplicación.
- `SMTP`: usar un servidor de pruebas o buzón controlado en `QAS`.

### 19.7 Despliegue en servidor

#### Opción A: Un solo servidor

- `Nginx` expone el frontend y redirige `/api` y `/ws` al backend.
- `Next.js` corre en `localhost:3000`.
- `NestJS` corre en `localhost:3001`.
- `PostgreSQL` y `Redis` corren como servicios locales protegidos por firewall.
- Los adjuntos se guardan en disco en una ruta persistente fuera del árbol del código.

#### Opción B: Servidor de aplicación + servidor de datos

- `Servidor 1`: frontend, backend y Nginx.
- `Servidor 2`: PostgreSQL, Redis y almacenamiento persistente.
- Recomendado cuando el volumen de tickets, adjuntos o concurrencia crezca.

### 19.8 Nginx de referencia

```nginx
server {
    listen 80;
    server_name qas.pgi.midominio.com pgi.midominio.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pgi.midominio.com;

    ssl_certificate /etc/ssl/pgi/fullchain.pem;
    ssl_certificate_key /etc/ssl/pgi/privkey.pem;

    client_max_body_size 25M;
    server_tokens off;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /auth/login {
        limit_req zone=login burst=10 nodelay;
        proxy_pass http://127.0.0.1:3001/auth/login;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://127.0.0.1:3001/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 19.9 Estrategia de backup y recuperación

#### Objetivo operativo

- Mantener un `RPO` máximo de 1 hora.
- Mantener un `RTO` máximo de 4 horas.
- Garantizar recuperación de base de datos, adjuntos y configuración crítica.

#### Alcance del respaldo

| Componente | Qué se respalda | Método |
|------------|------------------|--------|
| **PostgreSQL** | Estructura, datos, roles y metadatos operativos | `pg_dump` diario + backups lógicos + WAL si aplica |
| **Adjuntos** | Evidencias y archivos exportados | Copia incremental de `storage/attachments/` |
| **Configuración** | `.env`, configs de `nginx/`, scripts y jobs | Respaldo cifrado fuera del servidor |
| **Documentación operativa** | Runbooks, manuales y plantillas | Repositorio + copia periódica |

#### Política recomendada

| Tipo | Frecuencia | Retención | Destino |
|------|------------|-----------|---------|
| **Backup lógico completo DB** | Diario | 14 días | Disco secundario + ubicación remota |
| **Backup diferencial de adjuntos** | Cada 6 horas | 14 días | Disco secundario + ubicación remota |
| **Snapshot semanal** | Semanal | 8 semanas | Almacenamiento externo |
| **Snapshot mensual** | Mensual | 12 meses | Almacenamiento externo de largo plazo |

#### Ubicación de respaldos

```text
pgi/
├── db/
│   └── backups/
│       ├── daily/
│       ├── weekly/
│       ├── monthly/
│       └── restore-tests/
└── scripts/
    └── backup/
        ├── backup-db.ps1
        ├── backup-files.ps1
        ├── restore-db.ps1
        └── verify-backup.ps1
```

#### Convenciones de archivo

```text
db_daily_2026-04-13_020000.sql.gz
files_diff_2026-04-13_060000.zip
db_weekly_2026-W16.sql.gz
restore_report_2026-04-13.txt
```

#### Procedimiento mínimo

1. Ejecutar `pg_dump` sobre la base `pgi_db`.
2. Comprimir el archivo generado.
3. Copiar adjuntos y exportaciones del directorio `storage/attachments/`.
4. Calcular checksum del respaldo.
5. Replicar copia hacia una ubicación externa.
6. Registrar resultado en bitácora de operación.

#### Restauración

1. Levantar PostgreSQL limpio o una instancia temporal.
2. Restaurar el dump más reciente válido.
3. Reponer el árbol de `storage/attachments/`.
4. Validar integridad de tablas críticas, usuarios, incidencias, tracking y comentarios.
5. Probar login, consulta de tickets y descarga de adjuntos.

#### Automatización sugerida

- En Windows: programar scripts con `Task Scheduler`.
- En Linux: programar scripts con `cron`.
- En ambos casos: enviar alerta por correo si el respaldo falla.

#### Validación obligatoria

- Probar restauración completa al menos una vez al mes.
- Verificar checksums después de cada backup.
- Confirmar que al menos una copia esté fuera del servidor principal.
- Documentar fecha, responsable, resultado y tiempo de restauración.

### 19.10 Criterios de salida a producción

- Autenticación, autorización y recuperación de contraseña funcionales.
- Flujo completo de incidencias operativo: crear, asignar, comentar, resolver, cerrar y reabrir.
- Registro de tracking y auditoría persistido en base de datos.
- Subida y descarga segura de adjuntos validada.
- Notificaciones por correo probadas con plantillas reales.
- Dashboards mínimos y reportes base validados por usuarios clave.
- Backups de base de datos probados con restauración exitosa.
- Monitoreo y logs centralizados activos.
- Manual de operación y soporte documentado.

### 19.11 Fases de implementación alineadas al cierre del proyecto

#### Fase 1. Base operativa

- Modelo de datos y migraciones.
- Autenticación con JWT, roles y recuperación de contraseña.
- CRUD de incidencias con tracking de eventos.
- Gestión de sistemas, usuarios y catálogos base.

#### Fase 2. Operación diaria

- Portal de reporter para crear y consultar incidencias.
- Panel de agentes con cola de atención, filtros y detalle.
- Comentarios públicos e internos.
- Carga de adjuntos en almacenamiento local.

#### Fase 3. Colaboración y control

- Concurrencia optimista con campo `version`.
- WebSockets para actualizaciones en tiempo real.
- Alertas de SLA, reasignación y escalación.
- Bitácora de auditoría y notificaciones.

#### Fase 4. Cierre funcional

- Dashboards operativos y métricas clave.
- Exportación de reportes.
- Encuesta de satisfacción post-cierre.
- Hardening, pruebas integrales y documentación de operación.

### 19.12 Prioridad práctica para terminar la implementación

| Prioridad | Entregable | Resultado esperado |
|-----------|------------|-------------------|
| **Alta** | Autenticación + roles + guards | Base segura para todo el sistema |
| **Alta** | Módulo de incidencias y tracking | Núcleo funcional del producto |
| **Alta** | Comentarios + adjuntos + timeline | Experiencia completa de atención |
| **Alta** | Panel de agentes y portal reporter | Operación diaria usable |
| **Media** | WebSockets + concurrencia | Colaboración sin conflictos |
| **Media** | Notificaciones y SLA | Seguimiento operativo real |
| **Media** | Reportes y dashboard | Supervisión y toma de decisiones |
| **Baja** | Push, encuestas y automatizaciones avanzadas | Mejora de experiencia y madurez |

---

## 20. Roadmap

### 20.1 Roadmap sugerido para 2026

| Periodo | Objetivo | Entregables |
|---------|----------|-------------|
| **Abril - Mayo 2026** | Cerrar el core técnico | Auth, roles, usuarios, sistemas, incidencias, tracking |
| **Mayo - Junio 2026** | Completar operación diaria | Portal reporter, panel agente, comentarios, adjuntos |
| **Junio - Julio 2026** | Añadir colaboración | WebSockets, concurrencia, alertas, notificaciones |
| **Julio - Agosto 2026** | Cerrar capa de supervisión | Dashboard, reportes, SLA, auditoría |
| **Agosto 2026** | Preparar salida | Hardening, pruebas, documentación, despliegue |

### 20.2 Evolución posterior

- Integración con LDAP/Active Directory o SSO.
- API pública para integraciones con otras mesas de servicio.
- Motor de clasificación automática asistido por IA.
- Aplicación móvil para seguimiento de tickets.
- Base de conocimiento y autoservicio.

---

## Apéndice A: Variables de Entorno

```env
# Aplicación
APP_NAME=PGI
NODE_ENV=production
APP_PORT=3001
APP_URL=https://pgi.example.com
FRONTEND_URL=https://pgi.example.com
LOG_LEVEL=info

# Base de Datos
DATABASE_URL=postgresql://pgi:PASSWORD@localhost:5432/pgi_db
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# Redis
REDIS_ENABLED=true
REDIS_URL=redis://:PASSWORD@localhost:6379

# JWT
JWT_SECRET=your-256-bit-secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=soporte@example.com
SMTP_PASS=smtp-password
SMTP_FROM="PGI <soporte@example.com>"

# Storage
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./storage/attachments
SIGNED_URL_TTL_MINUTES=15

# Límites
MAX_FILE_SIZE=26214400
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

---

## Apéndice B: Endpoints API (Resumen)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/login` | Iniciar sesión | No |
| `POST` | `/auth/refresh` | Renovar token | Refresh |
| `POST` | `/auth/logout` | Cerrar sesión | JWT |
| `GET` | `/auth/me` | Obtener usuario autenticado | JWT |
| `GET` | `/incidents` | Listar incidencias con filtros | JWT |
| `POST` | `/incidents` | Crear incidencia | JWT |
| `GET` | `/incidents/:id` | Obtener detalle de incidencia | JWT + RLS |
| `PATCH` | `/incidents/:id` | Actualizar incidencia con control de versión | JWT + Agente+ |
| `POST` | `/incidents/:id/assign` | Asignar incidencia | JWT + Agente+ |
| `POST` | `/incidents/:id/status` | Cambiar estado | JWT + Agente+ |
| `GET` | `/incidents/:id/tracking` | Obtener timeline | JWT + RLS |
| `GET` | `/incidents/:id/comments` | Listar comentarios | JWT + RLS |
| `POST` | `/incidents/:id/comments` | Agregar comentario | JWT |
| `POST` | `/incidents/:id/attachments` | Subir adjunto | JWT |
| `GET` | `/incidents/:id/attachments/:fileId` | Descargar adjunto | JWT |
| `GET` | `/systems` | Listar sistemas gestionados | JWT |
| `POST` | `/systems` | Crear sistema | JWT + Admin |
| `GET` | `/users` | Listar usuarios | JWT + Admin |
| `POST` | `/users` | Crear usuario | JWT + Admin |
| `GET` | `/dashboard/stats` | KPIs operativos | JWT + Agente+ |
| `GET` | `/reports/:type` | Generar reporte | JWT + Supervisor+ |
| `WS` | `/ws` | Canal de tiempo real | JWT en handshake |
