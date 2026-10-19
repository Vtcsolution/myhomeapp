export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'SLOT_UNAVAILABLE'
  | 'COUPON_INVALID'
  | 'INSUFFICIENT_FUNDS'
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'NOT_REGISTERED'
  | 'ACCOUNT_BLOCKED'
  | 'NETWORK';

/** Error shape shared by the mock API and the future HTTP client. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
