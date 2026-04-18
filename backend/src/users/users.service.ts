import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string | null;
  phone: string | null;
  active: boolean;
  email_verified: boolean;
  last_login: string | null;
  force_password_change: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string | null;
  phone: string | null;
  active: boolean;
  emailVerified: boolean;
  lastLogin: string | null;
  forcePasswordChange: boolean;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_TEMP_PASSWORD = 'Temporal123!';

function toRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    department: row.department,
    phone: row.phone,
    active: row.active,
    emailVerified: row.email_verified,
    lastLogin: row.last_login,
    forcePasswordChange: row.force_password_change,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async listUsers(): Promise<UserRecord[]> {
    const { rows } = await this.db.query<UserRow>(
      `SELECT id, email, first_name, last_name, role, department, phone,
              active, email_verified, last_login, force_password_change,
              created_at, updated_at
       FROM users
       ORDER BY created_at ASC`,
    );
    return rows.map(toRecord);
  }

  async getUser(id: string): Promise<UserRecord> {
    const { rows } = await this.db.query<UserRow>(
      `SELECT id, email, first_name, last_name, role, department, phone,
              active, email_verified, last_login, force_password_change,
              created_at, updated_at
       FROM users WHERE id = $1`,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Usuario no encontrado');
    return toRecord(rows[0]);
  }

  async createUser(dto: CreateUserDto): Promise<UserRecord> {
    const emailLower = dto.email.toLowerCase().trim();

    const existing = await this.db.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [emailLower],
    );
    if (existing.rows[0]) {
      throw new ConflictException('Ya existe un usuario con ese correo electrónico');
    }

    const tempPassword = dto.password ?? DEFAULT_TEMP_PASSWORD;
    if (tempPassword.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }

    const hash = await bcrypt.hash(tempPassword, 10);
    const now = new Date().toISOString();

    const { rows } = await this.db.query<UserRow>(
      `INSERT INTO users (
         email, password_hash, first_name, last_name, role,
         department, phone, active, email_verified,
         force_password_change, failed_attempts,
         created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,true,false,true,0,$8,$8)
       RETURNING id, email, first_name, last_name, role, department, phone,
                 active, email_verified, last_login, force_password_change,
                 created_at, updated_at`,
      [
        emailLower,
        hash,
        dto.first_name.trim(),
        dto.last_name.trim(),
        dto.role,
        dto.department?.trim() ?? null,
        dto.phone?.trim() ?? null,
        now,
      ],
    );

    return toRecord(rows[0]);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<UserRecord> {
    const user = await this.getUser(id);

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.first_name !== undefined) { fields.push(`first_name = $${idx++}`); values.push(dto.first_name.trim()); }
    if (dto.last_name !== undefined)  { fields.push(`last_name = $${idx++}`);  values.push(dto.last_name.trim()); }
    if (dto.role !== undefined)       { fields.push(`role = $${idx++}`);       values.push(dto.role); }
    if (dto.department !== undefined) { fields.push(`department = $${idx++}`); values.push(dto.department?.trim() ?? null); }
    if (dto.phone !== undefined)      { fields.push(`phone = $${idx++}`);      values.push(dto.phone?.trim() ?? null); }
    if (dto.active !== undefined)     { fields.push(`active = $${idx++}`);     values.push(dto.active); }

    if (fields.length === 0) return user;

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const { rows } = await this.db.query<UserRow>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, email, first_name, last_name, role, department, phone,
                 active, email_verified, last_login, force_password_change,
                 created_at, updated_at`,
      values,
    );

    return toRecord(rows[0]);
  }

  async resetPassword(id: string): Promise<{ tempPassword: string }> {
    await this.getUser(id);
    const tempPassword = DEFAULT_TEMP_PASSWORD;
    const hash = await bcrypt.hash(tempPassword, 10);
    await this.db.query(
      `UPDATE users SET password_hash = $1, force_password_change = true, updated_at = NOW() WHERE id = $2`,
      [hash, id],
    );
    return { tempPassword };
  }
}
