import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      env: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    };
  }
}
