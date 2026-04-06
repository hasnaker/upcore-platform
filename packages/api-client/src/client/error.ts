/**
 * API error normalization.
 *
 * All HTTP errors are normalized into UpcoreApiError for consistent
 * error handling across hooks and UI components.
 */

/** Structured API error with Turkish localization support. */
export class UpcoreApiError extends Error {
  /** Machine-readable error code (e.g., "EMPLOYEE_NOT_FOUND") */
  readonly code: string;
  /** HTTP status code */
  readonly status: number;
  /** Additional error details (validation errors, etc.) */
  readonly details?: unknown;
  /** Request trace ID for debugging */
  readonly traceId: string;
  /** Turkish user-facing error message */
  readonly messageTr: string;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    details?: unknown;
    traceId: string;
    messageTr: string;
  }) {
    super(params.message);
    this.name = 'UpcoreApiError';
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
    this.traceId = params.traceId;
    this.messageTr = params.messageTr;
  }
}

/** Type guard to check if an error is an UpcoreApiError. */
export const isUpcoreApiError = (e: unknown): e is UpcoreApiError => {
  return e instanceof UpcoreApiError;
};

/**
 * Attempts to parse an API error response body into a structured format.
 */
interface ApiErrorBody {
  code?: string;
  message?: string;
  messageTr?: string;
  details?: unknown;
  traceId?: string;
  statusCode?: number;
}

/**
 * Normalizes any error into an UpcoreApiError.
 * Handles ky HTTPError, standard Error, and unknown types.
 */
export const toApiError = async (e: unknown): Promise<UpcoreApiError> => {
  // Handle ky HTTPError (has response property)
  if (
    e !== null &&
    typeof e === 'object' &&
    'response' in e &&
    e.response instanceof Response
  ) {
    const response = e.response;
    let body: ApiErrorBody = {};

    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // Response body is not JSON
    }

    return new UpcoreApiError({
      code: body.code ?? `HTTP_${response.status}`,
      message: body.message ?? response.statusText ?? 'An error occurred',
      status: response.status,
      details: body.details,
      traceId: body.traceId ?? response.headers.get('x-request-id') ?? generateTraceId(),
      messageTr: body.messageTr ?? getDefaultTurkishMessage(response.status),
    });
  }

  // Handle standard errors
  if (e instanceof Error) {
    return new UpcoreApiError({
      code: 'CLIENT_ERROR',
      message: e.message,
      status: 0,
      traceId: generateTraceId(),
      messageTr: 'Bir hata oluştu. Lütfen tekrar deneyin.',
    });
  }

  // Unknown error type
  return new UpcoreApiError({
    code: 'UNKNOWN_ERROR',
    message: String(e),
    status: 0,
    traceId: generateTraceId(),
    messageTr: 'Bilinmeyen bir hata oluştu.',
  });
};

/**
 * Synchronous version of toApiError for cases where we don't need to parse response body.
 */
export const toApiErrorSync = (e: unknown, status: number = 0): UpcoreApiError => {
  if (e instanceof UpcoreApiError) return e;

  if (e instanceof Error) {
    return new UpcoreApiError({
      code: 'CLIENT_ERROR',
      message: e.message,
      status,
      traceId: generateTraceId(),
      messageTr: 'Bir hata oluştu. Lütfen tekrar deneyin.',
    });
  }

  return new UpcoreApiError({
    code: 'UNKNOWN_ERROR',
    message: String(e),
    status,
    traceId: generateTraceId(),
    messageTr: 'Bilinmeyen bir hata oluştu.',
  });
};

const generateTraceId = (): string => {
  return `cli-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const getDefaultTurkishMessage = (status: number): string => {
  switch (status) {
    case 400:
      return 'Geçersiz istek. Lütfen bilgileri kontrol edin.';
    case 401:
      return 'Oturum süresi doldu. Lütfen tekrar giriş yapın.';
    case 403:
      return 'Bu işlem için yetkiniz bulunmamaktadır.';
    case 404:
      return 'İstenen kaynak bulunamadı.';
    case 409:
      return 'Kaynak çakışması. Sayfayı yenileyip tekrar deneyin.';
    case 422:
      return 'Gönderilen bilgilerde hata var. Lütfen kontrol edin.';
    case 429:
      return 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.';
    case 500:
    case 502:
    case 503:
      return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
    default:
      return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }
};
