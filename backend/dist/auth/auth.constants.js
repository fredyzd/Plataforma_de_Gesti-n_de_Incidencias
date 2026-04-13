"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INITIAL_PASSWORD_TOKEN_TTL_MINUTES = exports.RESET_TOKEN_TTL_MINUTES = exports.LOGIN_LOCK_MINUTES = exports.LOGIN_MAX_ATTEMPTS = exports.REFRESH_TOKEN_TTL_SECONDS = exports.ACCESS_TOKEN_TTL_SECONDS = void 0;
exports.ACCESS_TOKEN_TTL_SECONDS = Number(process.env.JWT_ACCESS_EXPIRES_SECONDS ?? 900);
exports.REFRESH_TOKEN_TTL_SECONDS = Number(process.env.JWT_REFRESH_EXPIRES_SECONDS ?? 60 * 60 * 24 * 7);
exports.LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS ?? 5);
exports.LOGIN_LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES ?? 15);
exports.RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES ?? 30);
exports.INITIAL_PASSWORD_TOKEN_TTL_MINUTES = Number(process.env.INITIAL_PASSWORD_TOKEN_TTL_MINUTES ?? 15);
//# sourceMappingURL=auth.constants.js.map