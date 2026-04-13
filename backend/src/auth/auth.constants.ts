export const ACCESS_TOKEN_TTL_SECONDS = Number(
  process.env.JWT_ACCESS_EXPIRES_SECONDS ?? 900,
);
export const REFRESH_TOKEN_TTL_SECONDS = Number(
  process.env.JWT_REFRESH_EXPIRES_SECONDS ?? 60 * 60 * 24 * 7,
);
export const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS ?? 5);
export const LOGIN_LOCK_MINUTES = Number(process.env.LOGIN_LOCK_MINUTES ?? 15);
export const RESET_TOKEN_TTL_MINUTES = Number(
  process.env.RESET_TOKEN_TTL_MINUTES ?? 30,
);
export const INITIAL_PASSWORD_TOKEN_TTL_MINUTES = Number(
  process.env.INITIAL_PASSWORD_TOKEN_TTL_MINUTES ?? 15,
);

