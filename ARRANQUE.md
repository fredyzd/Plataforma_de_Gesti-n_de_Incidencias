# PGI — Arranque rápido y checklist de publicación

## Arranque local (desarrollo)

```bash
# 1. Backend
cd backend
cp .env.example .env          # Ajustar secrets antes de producción
npm install
npm run start:dev             # http://localhost:3001

# 2. Frontend
cd ../frontend
npm install
npm run dev                   # http://localhost:3000
```

**Credenciales de prueba:**

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `agent@pgi.local` | `ChangeMe123!` | Agente |
| `reporter@pgi.local` | `ChangeMe123!` | Reporter (fuerza cambio de clave) |
| `admin@pgi.local` | `AdminChange123!` | Admin |

---

## Arranque con Docker

```bash
# QAS
docker compose up --build

# Producción
APP_ENV=production docker compose up --build -d
```

Frontend disponible en `http://localhost` (puerto 80 via Nginx).

---

## Checklist de publicación a producción

### Seguridad obligatoria

- [ ] Cambiar `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` (mín. 64 chars aleatorios)
- [ ] Cambiar `AUTH_DEFAULT_PASSWORD` y `AUTH_ADMIN_PASSWORD`
- [ ] Configurar `APP_ENV=production` en `.env`
- [ ] Habilitar HTTPS en `nginx/nginx.conf` (descomentar bloque SSL)
- [ ] Colocar certificados SSL en `/etc/ssl/certs/` y `/etc/ssl/private/`
- [ ] Verificar que `FRONTEND_URL` apunta al dominio real
- [ ] Configurar SMTP real (variables `SMTP_*`)

### Infraestructura

- [ ] Volumen `attachments_data` mapeado a disco persistente en el host
- [ ] Backup automático configurado (cron con `scripts/backup.sh`)
- [ ] Prueba de restauración ejecutada y verificada
- [ ] Logs de Nginx dirigidos a sistema de monitoreo (ELK / Grafana)

### Puertos expuestos (verificar firewall)

| Puerto | Servicio | Exponer externamente |
|--------|---------|---------------------|
| 80 | Nginx HTTP | ✅ Sí (redirige a 443) |
| 443 | Nginx HTTPS | ✅ Sí |
| 3001 | Backend API | ❌ Solo interno |

### Smoke test post-despliegue

```bash
# 1. Health del backend
curl -f http://localhost/api/health

# 2. Login
curl -X POST http://localhost/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@pgi.local","password":"AdminChange123!"}'

# 3. Resumen de reportes (con token del paso anterior)
curl http://localhost/api/reports/summary \
  -H 'Authorization: Bearer <access_token>'
```

---

## Backup manual

```bash
# Crear backup
./scripts/backup.sh

# Restaurar
./scripts/restore.sh /var/backups/pgi/attachments_YYYYMMDD_HHMMSS.tar.gz
```

**Cron recomendado** (diario a las 02:00):

```cron
0 2 * * * /ruta/al/proyecto/scripts/backup.sh >> /var/log/pgi-backup.log 2>&1
```

---

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Iniciar sesión |
| `POST` | `/api/auth/refresh` | Renovar token |
| `POST` | `/api/auth/logout` | Cerrar sesión |
| `GET` | `/api/auth/me` | Usuario actual |
| `GET/POST` | `/api/incidents` | Lista / crear incidencia |
| `GET/PATCH` | `/api/incidents/:id` | Detalle / editar |
| `POST` | `/api/incidents/:id/status` | Cambiar estado |
| `POST` | `/api/incidents/:id/assign` | Asignar agente |
| `GET/POST` | `/api/incidents/:id/comments` | Comentarios |
| `GET/POST` | `/api/incidents/:id/attachments` | Adjuntos |
| `GET` | `/api/incidents/:id/attachments/:aid/download` | Descarga protegida |
| `GET` | `/api/reports/summary` | KPIs operativos |
| `GET` | `/api/reports/aging` | Aging de tickets |
| `GET` | `/api/reports/sla` | Estado SLA por ticket |
| `GET` | `/api/notifications/log` | Log de correos (admin) |
| `WS` | `/socket.io` (`namespace /events`) | Eventos en tiempo real |
