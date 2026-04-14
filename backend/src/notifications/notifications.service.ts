import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type {
  NotificationLogEntry,
  SendEmailOptions,
} from './notifications.types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly log: NotificationLogEntry[] = [];
  private transporter: Transporter | null = null;
  private initialized = false;

  private async getTransporter(): Promise<Transporter | null> {
    if (this.initialized) return this.transporter;
    this.initialized = true;

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host && !user) {
      // QAS fallback: use Ethereal auto test account
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
        this.logger.log(
          `[QAS] Usando cuenta Ethereal: ${testAccount.user} — previsualiza en https://ethereal.email`,
        );
      } catch (err) {
        this.logger.warn(
          '[QAS] No se pudo crear cuenta Ethereal. Emails solo en log.',
        );
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

  private addToLog(
    entry: Omit<NotificationLogEntry, 'id' | 'createdAt'>,
  ): void {
    this.log.push({
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...entry,
    });

    if (this.log.length > 500) {
      this.log.shift();
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const from = process.env.SMTP_FROM ?? '"PGI Sistema" <noreply@pgi.local>';

    const transporter = await this.getTransporter();

    if (!transporter) {
      this.logger.log(
        `[EMAIL SKIPPED] to=${options.to} event=${options.event} subject="${options.subject}"`,
      );
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
      } else {
        this.logger.log(`[EMAIL] ${options.event} → ${options.to} ✓`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[EMAIL FAILED] ${options.event} → ${options.to}: ${message}`,
      );
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

  // Fire-and-forget wrapper
  queueEmail(options: SendEmailOptions): void {
    void this.sendEmail(options);
  }

  // --- Plantillas de eventos ---

  notifyIncidentCreated(params: {
    reporterEmail: string;
    ticketNumber: string;
    title: string;
    priority: string;
  }): void {
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

  notifyIncidentAssigned(params: {
    assigneeEmail: string;
    ticketNumber: string;
    title: string;
    assignedByEmail: string;
  }): void {
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

  notifyStatusChanged(params: {
    reporterEmail: string;
    ticketNumber: string;
    title: string;
    oldStatus: string;
    newStatus: string;
    comment?: string | null;
  }): void {
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

  notifyCommentAdded(params: {
    recipientEmail: string;
    ticketNumber: string;
    title: string;
    authorEmail: string;
    commentBody: string;
  }): void {
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

  notifyPasswordReset(params: {
    email: string;
    resetToken: string;
    env: string;
  }): void {
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

  getLog(): NotificationLogEntry[] {
    return [...this.log].reverse();
  }
}
