# 🛡️ PGI — Ajustes y Mejoras Pendientes v2

> Plan de ejecución por etapas para mantener el desarrollo organizado, con pausas de recarga de token entre bloques.
> Alcance alineado al documento maestro `# 🛡️ PGI — Plataforma de Gestión d.md`.

---

## 1. Objetivo de esta planificación

- Ejecutar PGI en fases cortas, cerrando entregables concretos por etapa.
- Reducir retrabajo con validaciones de cierre por etapa.
- Incluir tiempos de pausa para recarga de token y revisión antes del siguiente bloque.

---

## 2. Regla operativa de recarga de token

- Al finalizar cada etapa técnica se hace una `Ventana de recarga de token` de `10 a 20 minutos`.
- Durante esa ventana no se codifica: solo se documenta avance, pendientes y riesgos.
- No se inicia una etapa nueva sin checklist de cierre de la anterior.

Plantilla rápida de cierre por etapa:

```text
ETAPA: [nombre]
Estado: Completada / Parcial
Entregables cerrados:
- ...
Bloqueos:
- ...
Pendientes para siguiente etapa:
- ...
Hora de pausa para recarga de token:
- Inicio:
- Fin:
```

---

## 3. Etapas del proyecto (orden recomendado)

## Etapa 0 — Preparación y base técnica

Entregables:
- Estructura de carpetas final del proyecto.
- Variables de entorno separadas para `QAS` y `Producción`.
- Configuración base de `frontend`, `backend`, `db`, `storage`, `scripts`.
- Convención de ramas y estrategia de merges.

Checklist de cierre:
- Proyecto arranca local sin errores críticos.
- Existe `.env.example` actualizado.
- Existe documento de arranque rápido.

Ventana recarga token:
- 10 a 15 minutos.

## Etapa 1 — Seguridad de acceso (Login + sesión)

Entregables:
- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- JWT de corta vida + refresh token rotativo.
- Bloqueo por intentos fallidos y rate limit de login.
- Flujo de recuperación de contraseña.
- Flujo de cambio obligatorio de contraseña en primer acceso.

Checklist de cierre:
- Login válido y login inválido probados.
- Refresh funcionando con rotación.
- Logout revoca sesión.
- Auditoría registra eventos de auth.

Ventana recarga token:
- 15 a 20 minutos.

## Etapa 2 — Núcleo de incidencias

Entregables:
- CRUD de incidencias.
- Tracking de eventos por ticket.
- Comentarios públicos e internos.
- Estados y transiciones validadas.
- Control de concurrencia por `version`.

Checklist de cierre:
- Ticket puede crearse, asignarse, resolverse, cerrarse y reabrirse.
- Timeline muestra eventos reales.
- Conflictos de edición detectados.

Ventana recarga token:
- 10 a 15 minutos.

## Etapa 3 — Adjuntos, notificaciones y servicios

Entregables:
- Subida/descarga de adjuntos con validación.
- Seguridad de archivos (mime, tamaño, nombre, checksum).
- Notificaciones por correo.
- Logs de envío y trazabilidad.

Checklist de cierre:
- Subida y descarga autorizada funcional.
- Adjuntos no públicos por URL directa.
- Correos transaccionales probados en `QAS`.

Ventana recarga token:
- 10 a 20 minutos.

## Etapa 4 — Frontend operativo completo

Entregables:
- Portal reporter completo (WF-10 a WF-21).
- Panel agente/supervisor/admin (WF-30 a WF-41).
- Indicador visible de entorno en login (`QAS` / `PROD`).
- Estados de carga, error y vacíos consistentes.

Checklist de cierre:
- Navegación end-to-end completa.
- Formularios con validación.
- Vistas principales sin errores bloqueantes.

Ventana recarga token:
- 15 minutos.

## Etapa 5 — Reportería, SLA y colaboración

Entregables:
- Dashboard operativo.
- Reportes base.
- Alertas de SLA.
- Eventos en tiempo real (WebSocket).

Checklist de cierre:
- KPIs visibles y coherentes.
- Reportes exportables.
- Alertas disparadas según reglas.

Ventana recarga token:
- 10 a 15 minutos.

## Etapa 6 — Hardening y salida a QAS/Producción

Entregables:
- Hardening de servidor web.
- Nginx con HTTPS, cabeceras y límites.
- Backups automáticos + prueba de restauración.
- Checklist de publicación.

Checklist de cierre:
- Prueba de restauración exitosa.
- Puertos internos no expuestos.
- Auditoría y monitoreo activos.
- Aprobación para despliegue.

Ventana recarga token:
- 20 minutos y retrospectiva final.

---

## 4. Cadencia sugerida de trabajo

Modelo semanal sugerido:

- Semana 1: Etapa 0 y Etapa 1.
- Semana 2: Etapa 2.
- Semana 3: Etapa 3 y Etapa 4.
- Semana 4: Etapa 5.
- Semana 5: Etapa 6 + estabilización.

Si hay menos tiempo disponible:

- Priorizar en este orden: `Etapa 1 -> Etapa 2 -> Etapa 4 -> Etapa 6`.

---

## 5. Criterio de avance por etapa (DoD)

Una etapa se considera cerrada solo si cumple:

1. Entregables implementados.
2. Checklist de cierre completo.
3. Riesgos documentados.
4. Pausa de recarga de token ejecutada.
5. Próxima etapa definida con tareas concretas.

---

## 6. Bitácora corta por etapas

```text
[FECHA] Etapa:
- Resultado:
- Qué funcionó:
- Qué faltó:
- Riesgo principal:
- Acción siguiente:
```

---

## 7. Nota de uso

Este documento se usa como tablero de ejecución práctico.  
El detalle funcional y técnico completo sigue viviendo en:
- `# 🛡️ PGI — Plataforma de Gestión d.md`

---

## 8. Tablero Ejecutable (Checklist)

## 8.1 Estado general

- [ ] Etapa 0 completada
- [x] Etapa 1 completada — Auth, JWT, refresh rotativo, recuperación, bloqueo
- [x] Etapa 2 completada — CRUD incidencias, tracking, comentarios, concurrencia
- [x] Etapa 3 completada — Adjuntos (upload/download/checksum), notificaciones email
- [x] Etapa 4 completada — Frontend completo (login, portal reporter, panel agente)
- [x] Etapa 5 completada — Reportes KPIs, aging, SLA, WebSocket tiempo real
- [x] Etapa 6 completada — Nginx hardened, Docker, backups, checklist publicación

---

## 8.2 Checklist por etapa

## Etapa 0 — Preparación y base técnica

- [ ] Estructura de carpetas final creada
- [ ] Variables `QAS` y `Producción` separadas
- [ ] Configuración base (`frontend`, `backend`, `db`, `storage`, `scripts`)
- [ ] Convención de ramas definida
- [ ] Arranque local sin errores críticos
- [ ] `.env.example` actualizado
- [ ] Documento de arranque rápido listo
- [ ] Recarga de token realizada (10-15 min)

## Etapa 1 — Seguridad de acceso

- [x] `POST /auth/login`
- [x] `POST /auth/refresh`
- [x] `POST /auth/logout`
- [x] `GET /auth/me`
- [x] JWT corto + refresh rotativo
- [x] Bloqueo por intentos fallidos
- [x] Rate limit de login
- [x] Recuperación de contraseña
- [x] Cambio obligatorio en primer acceso
- [x] Auditoría de eventos de auth
- [ ] Recarga de token realizada (15-20 min)

## Etapa 2 — Núcleo de incidencias

- [x] CRUD de incidencias
- [x] Tracking de eventos
- [x] Comentarios públicos e internos
- [x] Estados y transiciones validadas
- [x] Concurrencia por `version`
- [x] Flujo completo: crear -> asignar -> resolver -> cerrar -> reabrir
- [x] Timeline verificado con datos reales
- [x] Conflictos de edición detectados
- [ ] Recarga de token realizada (10-15 min)

## Etapa 3 — Adjuntos y notificaciones

- [x] Upload y download de adjuntos
- [x] Validación de tipo, tamaño y nombre
- [x] Checksum de archivo almacenado (SHA-256)
- [x] Adjuntos protegidos (sin URL pública directa)
- [x] Notificaciones por correo funcionales (nodemailer + Ethereal en QAS)
- [x] Logs de envío trazables (`GET /notifications/log`)
- [ ] Pruebas en `QAS` completadas
- [ ] Recarga de token realizada (10-20 min)

## Etapa 4 — Frontend operativo

- [x] Portal reporter (`WF-10` a `WF-21`) — Dashboard, crear incidencia, lista, detalle
- [x] Panel agentes/admin (`WF-30` a `WF-41`) — misma UI con acciones de cambio de estado, comentarios internos
- [x] Indicador de entorno en login (`QAS` / `PROD`)
- [x] Estados de carga y error consistentes (Spinner, mensajes inline)
- [x] Navegación end-to-end validada (ProtectedRoute, redirects)
- [x] Formularios con validación (title, description, password, status)
- [x] Sin errores bloqueantes visibles (build limpio)
- [ ] Recarga de token realizada (15 min)

## Etapa 5 — Reportería y colaboración

- [x] Dashboard operativo (KPIs: total, activas, MTTR, SLA%)
- [x] Reportes base (aging por antigüedad, SLA por ticket)
- [x] Alertas de SLA activas (badge vencido + fila roja en tabla)
- [x] WebSocket en tiempo real funcional (EventsGateway + socket.io-client)
- [x] KPIs validados con datos de prueba
- [ ] Recarga de token realizada (10-15 min)

## Etapa 6 — Hardening y salida

- [x] Hardening de servidor aplicado (server_tokens off, timeouts, tamaño límite)
- [x] Nginx con HTTPS y cabeceras de seguridad (CSP, X-Frame, HSTS, rate limit)
- [x] Backups automáticos configurados (`scripts/backup.sh` + cron recomendado)
- [x] Restauración validada (`scripts/restore.sh` con verificación de checksum)
- [x] Puertos internos no expuestos (backend solo interno via Docker, 3001 no mapeado)
- [x] Docker Compose con healthcheck y volúmenes persistentes
- [x] Checklist de publicación completo (`ARRANQUE.md`)
- [ ] Recarga de token y retrospectiva final (20 min)

---

## 8.3 Control de recarga de token

| Fecha | Etapa | Hora inicio pausa | Hora fin pausa | Estado |
|------|------|-------------------|---------------|--------|
|      |      |                   |               |        |
|      |      |                   |               |        |
|      |      |                   |               |        |

---

## 8.4 Registro diario de avance

| Fecha | Etapa activa | Avance del día | Bloqueo | Acción siguiente |
|------|--------------|----------------|---------|------------------|
|      |              |                |         |                  |
|      |              |                |         |                  |
|      |              |                |         |                  |

---

## 9. Plan de 10 días (ejecución práctica)

## Día 1

- Cerrar estructura de carpetas final.
- Ajustar `.env.example` con `QAS` y `Producción`.
- Validar arranque base de backend y frontend.
- Registrar cierre de Etapa 0.
- Recarga de token: 10-15 min.

## Día 2

- Implementar `POST /auth/login` y `GET /auth/me`.
- Integrar hash de contraseña y validación de credenciales.
- Agregar auditoría de login exitoso/fallido.
- Recarga de token: 15-20 min.

## Día 3

- Implementar `POST /auth/refresh` y `POST /auth/logout`.
- Activar rotación de refresh token.
- Probar expiración y revocación de sesión.
- Recarga de token: 15-20 min.

## Día 4

- Implementar recuperación de contraseña.
- Implementar cambio obligatorio de contraseña en primer acceso.
- Activar rate limit y bloqueo temporal de login.
- Cerrar Etapa 1.
- Recarga de token: 10-15 min.

## Día 5

- Implementar CRUD de incidencias.
- Implementar tracking básico de eventos.
- Definir transiciones de estado válidas.
- Recarga de token: 10-15 min.

## Día 6

- Implementar comentarios públicos/internos.
- Implementar concurrencia optimista con `version`.
- Validar flujo completo de ticket.
- Cerrar Etapa 2.
- Recarga de token: 10-15 min.

## Día 7

- Implementar adjuntos: upload + download protegido.
- Validar tipo, tamaño, nombre y checksum.
- Integrar notificaciones por correo base.
- Recarga de token: 10-20 min.

## Día 8

- Completar portal reporter clave (`WF-10` a `WF-21`).
- Completar vistas operativas agente (`WF-30` a `WF-34`).
- Ajustar login con indicador `QAS/PROD`.
- Cerrar Etapa 3 y Etapa 4.
- Recarga de token: 15 min.

## Día 9

- Implementar dashboard y reportes base.
- Integrar alertas SLA.
- Activar eventos en tiempo real (WebSocket).
- Cerrar Etapa 5.
- Recarga de token: 10-15 min.

## Día 10

- Hardening de servidor y Nginx seguro.
- Verificar backups automáticos y restauración.
- Ejecutar checklist de publicación.
- Cerrar Etapa 6 y retrospectiva final.
- Recarga de token: 20 min.

---

## 10. Semáforo de control diario

| Color | Significado | Acción |
|------|-------------|--------|
| `Verde` | Día completado | Pasar al siguiente día |
| `Amarillo` | Día parcial con bloqueos | Resolver bloqueo antes de avanzar |
| `Rojo` | Día no ejecutado | Reprogramar y reducir alcance del siguiente día |

---

## 11. Etapa 1 en ejecución (Login + Sesión + Seguridad de acceso)

## 11.1 Objetivo operativo de la etapa

- Dejar estable el acceso de usuarios en `QAS`.
- Tener sesiones seguras con renovación controlada.
- Asegurar trazabilidad completa de eventos de autenticación.

---

## 11.2 Backlog técnico de Etapa 1 (orden de implementación)

## Bloque A — Base de autenticación

- [ ] Definir DTOs y validaciones de `login`, `refresh`, `logout`.
- [ ] Implementar servicio de validación de credenciales.
- [ ] Verificar hash de contraseña (`bcrypt`).
- [ ] Crear emisor de JWT (`access token` + `refresh token`).
- [ ] Configurar expiraciones y secretos por entorno (`QAS` / `PROD`).

## Bloque B — Endpoints críticos

- [ ] `POST /auth/login`
- [ ] `GET /auth/me`
- [ ] `POST /auth/refresh`
- [ ] `POST /auth/logout`

## Bloque C — Seguridad adicional

- [ ] Rate limit estricto para login y refresh.
- [ ] Bloqueo temporal por intentos fallidos.
- [ ] Respuesta genérica para login inválido (sin revelar usuario/contraseña).
- [ ] Registro de auditoría en login exitoso y fallido.
- [ ] Revocación de refresh token en logout.

## Bloque D — Recuperación y primer acceso

- [ ] `POST /auth/forgot-password`
- [ ] `POST /auth/reset-password`
- [ ] Token de recuperación con expiración y un solo uso.
- [ ] Flujo de cambio obligatorio en primer login.
- [ ] Revocar sesiones previas después de cambio de contraseña.

---

## 11.3 Contratos mínimos de respuesta

`POST /auth/login` (200):

```json
{
  "access_token": "<jwt>",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "email": "usuario@empresa.com",
    "role": "agent"
  }
}
```

`POST /auth/refresh` (200):

```json
{
  "access_token": "<jwt>",
  "expires_in": 900
}
```

`GET /auth/me` (200):

```json
{
  "id": "uuid",
  "email": "usuario@empresa.com",
  "role": "agent",
  "first_name": "Nombre",
  "last_name": "Apellido"
}
```

Error de autenticación (401):

```json
{
  "message": "Credenciales inválidas o sesión expirada"
}
```

---

## 11.4 Pruebas mínimas de aceptación (DoD Etapa 1)

- [ ] Login válido retorna `access token` y sesión activa.
- [ ] Login inválido no revela qué campo falló.
- [ ] Refresh válido rota token correctamente.
- [ ] Refresh inválido devuelve `401`.
- [ ] Logout invalida sesión y bloquea refresh reutilizado.
- [ ] `/auth/me` responde datos del usuario autenticado.
- [ ] Bloqueo temporal se activa tras intentos fallidos.
- [ ] Recuperación de contraseña funciona con token de un solo uso.
- [ ] Cambio inicial obligatorio funciona y limpia el flag.
- [ ] Auditoría registra todos los eventos críticos.

---

## 11.5 Secuencia recomendada por día (continuación inmediata)

## Día 2 (hoy)

- [ ] Completar `login` y `me`.
- [ ] Probar con usuario válido e inválido.
- [ ] Registrar auditoría de auth básica.

## Día 3

- [ ] Completar `refresh` y `logout`.
- [ ] Integrar rotación de refresh token.
- [ ] Probar expiración real de sesión.

## Día 4

- [ ] Completar recuperación y reset de contraseña.
- [ ] Completar cambio obligatorio de primer acceso.
- [ ] Validar rate limit + bloqueo temporal.
- [ ] Cerrar Etapa 1.

---

## 11.6 Registro rápido de ejecución de Etapa 1

| Fecha | Bloque | Estado | Resultado | Siguiente acción |
|------|--------|--------|-----------|------------------|
|      | A      |        |           |                  |
|      | B      |        |           |                  |
|      | C      |        |           |                  |
|      | D      |        |           |                  |

---

## 11.7 Ventana de recarga de token (Etapa 1)

- [ ] Pausa 1 ejecutada (fin bloque A/B): 15 min.
- [ ] Pausa 2 ejecutada (fin bloque C): 15 min.
- [ ] Pausa 3 ejecutada (cierre etapa): 10-15 min.
