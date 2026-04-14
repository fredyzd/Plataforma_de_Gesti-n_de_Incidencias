"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const nodemailer = __importStar(require("nodemailer"));
let NotificationsService = NotificationsService_1 = class NotificationsService {
    logger = new common_1.Logger(NotificationsService_1.name);
    log = [];
    transporter = null;
    initialized = false;
    async getTransporter() {
        if (this.initialized)
            return this.transporter;
        this.initialized = true;
        const host = process.env.SMTP_HOST;
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        if (!host && !user) {
            try {
                const testAccount = await nodemailer.createTestAccount();
                this.transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass,
                    },
                });
                this.logger.log(`[QAS] Usando cuenta Ethereal: ${testAccount.user} — previsualiza en https://ethereal.email`);
            }
            catch (err) {
                this.logger.warn('[QAS] No se pudo crear cuenta Ethereal. Emails solo en log.');
                this.transporter = null;
            }
            return this.transporter;
        }
        const port = Number(process.env.SMTP_PORT ?? 587);
        const secure = process.env.SMTP_SECURE === 'true';
        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: user && pass ? { user, pass } : undefined,
        });
        return this.transporter;
    }
    addToLog(entry) {
        this.log.push({
            id: (0, crypto_1.randomUUID)(),
            createdAt: new Date().toISOString(),
            ...entry,
        });
        if (this.log.length > 500) {
            this.log.shift();
        }
    }
    async sendEmail(options) {
        const from = process.env.SMTP_FROM ?? '"PGI Sistema" <noreply@pgi.local>';
        const transporter = await this.getTransporter();
        if (!transporter) {
            this.logger.log(`[EMAIL SKIPPED] to=${options.to} event=${options.event} subject="${options.subject}"`);
            this.addToLog({
                to: options.to,
                subject: options.subject,
                event: options.event,
                status: 'skipped',
                messageId: null,
                errorMessage: 'Sin transporter SMTP configurado',
            });
            return;
        }
        try {
            const info = await transporter.sendMail({
                from,
                to: options.to,
                subject: options.subject,
                html: options.html,
            });
            this.addToLog({
                to: options.to,
                subject: options.subject,
                event: options.event,
                status: 'sent',
                messageId: info.messageId ?? null,
                errorMessage: null,
            });
            const preview = nodemailer.getTestMessageUrl(info);
            if (preview) {
                this.logger.log(`[EMAIL] ${options.event} → Preview: ${preview}`);
            }
            else {
                this.logger.log(`[EMAIL] ${options.event} → ${options.to} ✓`);
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`[EMAIL FAILED] ${options.event} → ${options.to}: ${message}`);
            this.addToLog({
                to: options.to,
                subject: options.subject,
                event: options.event,
                status: 'failed',
                messageId: null,
                errorMessage: message,
            });
        }
    }
    queueEmail(options) {
        void this.sendEmail(options);
    }
    notifyIncidentCreated(params) {
        this.queueEmail({
            to: params.reporterEmail,
            subject: `[PGI] Incidencia creada: ${params.ticketNumber}`,
            event: 'incident.created',
            html: `
        <h2>Tu incidencia fue registrada</h2>
        <p><strong>Ticket:</strong> ${params.ticketNumber}</p>
        <p><strong>Título:</strong> ${params.title}</p>
        <p><strong>Prioridad:</strong> ${params.priority}</p>
        <p>Te notificaremos cuando haya cambios en tu solicitud.</p>
        <hr>
        <small>PGI — Plataforma de Gestión de Incidencias</small>
      `,
        });
    }
    notifyIncidentAssigned(params) {
        this.queueEmail({
            to: params.assigneeEmail,
            subject: `[PGI] Incidencia asignada: ${params.ticketNumber}`,
            event: 'incident.assigned',
            html: `
        <h2>Se te asignó una incidencia</h2>
        <p><strong>Ticket:</strong> ${params.ticketNumber}</p>
        <p><strong>Título:</strong> ${params.title}</p>
        <p><strong>Asignado por:</strong> ${params.assignedByEmail}</p>
        <hr>
        <small>PGI — Plataforma de Gestión de Incidencias</small>
      `,
        });
    }
    notifyStatusChanged(params) {
        this.queueEmail({
            to: params.reporterEmail,
            subject: `[PGI] Estado actualizado: ${params.ticketNumber}`,
            event: 'incident.status_changed',
            html: `
        <h2>Estado de tu incidencia actualizado</h2>
        <p><strong>Ticket:</strong> ${params.ticketNumber}</p>
        <p><strong>Título:</strong> ${params.title}</p>
        <p><strong>Estado anterior:</strong> ${params.oldStatus}</p>
        <p><strong>Nuevo estado:</strong> ${params.newStatus}</p>
        ${params.comment ? `<p><strong>Comentario:</strong> ${params.comment}</p>` : ''}
        <hr>
        <small>PGI — Plataforma de Gestión de Incidencias</small>
      `,
        });
    }
    notifyCommentAdded(params) {
        this.queueEmail({
            to: params.recipientEmail,
            subject: `[PGI] Nuevo comentario: ${params.ticketNumber}`,
            event: 'incident.comment_added',
            html: `
        <h2>Nuevo comentario en tu incidencia</h2>
        <p><strong>Ticket:</strong> ${params.ticketNumber}</p>
        <p><strong>Título:</strong> ${params.title}</p>
        <p><strong>Comentario de:</strong> ${params.authorEmail}</p>
        <blockquote>${params.commentBody}</blockquote>
        <hr>
        <small>PGI — Plataforma de Gestión de Incidencias</small>
      `,
        });
    }
    notifyPasswordReset(params) {
        const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
        const resetUrl = `${frontendUrl}/auth/reset-password?token=${params.resetToken}`;
        this.queueEmail({
            to: params.email,
            subject: '[PGI] Recuperación de contraseña',
            event: 'auth.reset_password',
            html: `
        <h2>Recuperación de contraseña</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente enlace (válido por 30 minutos):</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        ${params.env !== 'production' ? `<p><small>[DEV] Token directo: <code>${params.resetToken}</code></small></p>` : ''}
        <p>Si no solicitaste este cambio, ignora este correo.</p>
        <hr>
        <small>PGI — Plataforma de Gestión de Incidencias</small>
      `,
        });
    }
    getLog() {
        return [...this.log].reverse();
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)()
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map