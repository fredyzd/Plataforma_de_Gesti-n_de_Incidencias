# PGI — Plataforma de Gestión de Incidencias

Sistema integral de gestión, seguimiento y resolución de incidencias para equipos de soporte TI. Permite a los usuarios reportar problemas con evidencia adjunta y hacer seguimiento en tiempo real, mientras los equipos de soporte clasifican, asignan y resuelven cada incidente con trazabilidad completa.

---

## Características principales

- **Ciclo de vida completo** — apertura, asignación, seguimiento, resolución y cierre con bitácora inmutable
- **Tres roles diferenciados** — Reporter, Agente y Administrador con interfaces optimizadas para cada uno
- **Tiempo real** — actualizaciones instantáneas vía WebSockets (Socket.IO)
- **Adjuntos protegidos** — carga y descarga de evidencias con acceso autenticado (hasta 25 MB por archivo)
- **Notificaciones por correo** — alertas automáticas en cada cambio de estado o asignación
- **Reportería y KPIs** — dashboards de resumen, aging de tickets y cumplimiento de SLA
- **Seguridad** — JWT con refresh tokens, rate limiting, bcrypt, CORS estricto

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 19, Vite, TypeScript, TailwindCSS 4, React Query, React Router 7 |
| **Backend** | NestJS 11, TypeScript, Passport JWT, Socket.IO, Nodemailer, Multer |
| **Base de datos** | PostgreSQL 16+ |
| **Proxy / SSL** | Nginx 1.27 |
| **Contenedores** | Docker, Docker Compose |

---

## Estructura del repositorio

```
.
├── backend/          # API REST + WebSockets (NestJS)
│   └── src/
│       ├── auth/           # Autenticación JWT + refresh tokens
│       ├── incidents/      # CRUD de incidencias + estados + comentarios
│       ├── attachments/    # Carga y descarga de adjuntos
│       ├── notifications/  # Envío de correos (Nodemailer)
│       ├── reports/        # KPIs, aging, SLA
│       └── events/         # Gateway WebSocket (/events)
├── frontend/         # SPA React
│   └── src/
│       ├── pages/          # auth/, incidents/, reports/
│       ├── components/     # UI reutilizable + layout
│       ├── context/        # Estado global (auth, socket)
│       └── hooks/          # React Query + lógica compartida
├── nginx/            # Configuración Nginx (HTTP + HTTPS)
├── scripts/          # backup.sh y restore.sh
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
└── ARRANQUE.md       # Guía de arranque rápido y checklist de producción
```

---

## Arranque local (desarrollo)

### Requisitos previos

- Node.js 20+
- PostgreSQL 16+ (instancia local o remota)
- npm

### Backend

```bash
cd backend
cp .env.example .env   # Completar variables de entorno
npm install
npm run start:dev      # http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

### Credenciales de prueba

| Email | Contraseña | Rol |
|-------|-----------|-----|
| `admin@pgi.local` | `AdminChange123!` | Administrador |
| `agent@pgi.local` | `ChangeMe123!` | Agente |
| `reporter@pgi.local` | `ChangeMe123!` | Reporter |

---

## Arranque con Docker

```bash
# QAS (desarrollo / staging)
docker compose up --build

# Producción
APP_ENV=production docker compose up --build -d
```

Frontend disponible en `http://localhost` (puerto 80 vía Nginx).

---

## Variables de entorno (backend)

Crear `backend/.env` a partir de `backend/.env.example`. Las variables mínimas requeridas:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `JWT_ACCESS_SECRET` | Secreto para tokens de acceso (mín. 64 chars) |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens (mín. 64 chars) |
| `FRONTEND_URL` | URL del frontend (para CORS) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Configuración SMTP para correos |
| `AUTH_DEFAULT_PASSWORD` | Contraseña por defecto para cuentas nuevas |
| `AUTH_ADMIN_PASSWORD` | Contraseña inicial del administrador |

---

## API — Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Iniciar sesión |
| `POST` | `/api/auth/refresh` | Renovar access token |
| `POST` | `/api/auth/logout` | Cerrar sesión |
| `GET` | `/api/auth/me` | Usuario autenticado |
| `GET / POST` | `/api/incidents` | Listar / crear incidencia |
| `GET / PATCH` | `/api/incidents/:id` | Detalle / editar incidencia |
| `POST` | `/api/incidents/:id/status` | Cambiar estado |
| `POST` | `/api/incidents/:id/assign` | Asignar agente |
| `GET / POST` | `/api/incidents/:id/comments` | Comentarios |
| `GET / POST` | `/api/incidents/:id/attachments` | Adjuntos |
| `GET` | `/api/incidents/:id/attachments/:aid/download` | Descarga protegida |
| `GET` | `/api/reports/summary` | KPIs operativos |
| `GET` | `/api/reports/aging` | Aging de tickets |
| `GET` | `/api/reports/sla` | Estado SLA por ticket |
| `GET` | `/api/notifications/log` | Log de correos (admin) |
| `WS` | `/socket.io` (namespace `/events`) | Eventos en tiempo real |

---

## Roles y permisos

| Acción | Reporter | Agente | Admin |
|--------|:--------:|:------:|:-----:|
| Crear incidencia | ✅ | ✅ | ✅ |
| Ver sus propias incidencias | ✅ | ✅ | ✅ |
| Ver todas las incidencias | ❌ | ✅ | ✅ |
| Cambiar estado / asignar | ❌ | ✅ | ✅ |
| Ver reportes / KPIs | ❌ | ✅ | ✅ |
| Ver log de notificaciones | ❌ | ❌ | ✅ |
| Gestionar usuarios | ❌ | ❌ | ✅ |

---

## Backup y restauración

```bash
# Crear backup de adjuntos
./scripts/backup.sh

# Restaurar desde backup
./scripts/restore.sh /var/backups/pgi/attachments_YYYYMMDD_HHMMSS.tar.gz
```

**Cron recomendado** (diario a las 02:00):

```cron
0 2 * * * /ruta/al/proyecto/scripts/backup.sh >> /var/log/pgi-backup.log 2>&1
```

---

## Guía de producción

Ver [ARRANQUE.md](ARRANQUE.md) para el checklist completo de seguridad, configuración SSL, puertos de firewall y smoke tests post-despliegue.

Puntos críticos antes de publicar:

- Reemplazar todos los secrets (`JWT_*`, `AUTH_*`) por valores aleatorios de al menos 64 caracteres
- Habilitar HTTPS en `nginx/nginx.conf` y colocar los certificados SSL
- Configurar un servidor SMTP real
- Mapear el volumen `attachments_data` a disco persistente con backup automático

---

## Licencia

Uso interno — todos los derechos reservados.
