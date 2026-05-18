/**
 * アプリ全体で使用するエラー分類ユーティリティ。
 * Supabase の { data, error } パターンや try-catch いずれにも対応。
 */

export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTH_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR'

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * 任意のエラー（Supabase error オブジェクト、Error インスタンス、不明値）を
 * AppError に正規化する。
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error

  if (error && typeof error === 'object') {
    const e       = error as Record<string, unknown>
    const message = (typeof e.message === 'string' ? e.message : '') as string
    const status  = typeof e.status  === 'number' ? e.status  : undefined
    const code    = typeof e.code    === 'string' ? e.code    : undefined

    // 認証エラー（HTTP 401 / JWT / Supabase PGRST301）
    if (
      status === 401 ||
      code === 'PGRST301' ||
      /jwt|session expired|not authenticated|invalid token/i.test(message)
    ) {
      return new AppError('セッションが切れました', 'AUTH_REQUIRED', error)
    }

    // 権限エラー（HTTP 403 / RLS 違反）
    if (
      status === 403 ||
      /permission|denied|row.level security|rls/i.test(message)
    ) {
      return new AppError('権限がありません', 'PERMISSION_DENIED', error)
    }

    // 未検出（HTTP 404）
    if (status === 404 || /not found/i.test(message)) {
      return new AppError('データが見つかりません', 'NOT_FOUND', error)
    }

    // ネットワークエラー
    if (/network|fetch|failed to fetch|net::/i.test(message)) {
      return new AppError('ネットワークエラー', 'NETWORK_ERROR', error)
    }

    // サーバーエラー（HTTP 5xx）
    if (status !== undefined && status >= 500) {
      return new AppError('サーバーエラー', 'SERVER_ERROR', error)
    }

    if (message) {
      return new AppError(message, 'UNKNOWN_ERROR', error)
    }
  }

  return new AppError('不明なエラー', 'UNKNOWN_ERROR', error)
}

/** ErrorCode に対応するユーザー向けメッセージを返す */
export function getUserMessage(error: AppError): string {
  const messages: Record<ErrorCode, string> = {
    NETWORK_ERROR:     'ネットワークに接続できません',
    AUTH_REQUIRED:     'セッションが切れました。再ログインしてください',
    PERMISSION_DENIED: '権限がありません',
    NOT_FOUND:         'データが見つかりません',
    VALIDATION_ERROR:  '入力内容を確認してください',
    SERVER_ERROR:      'サーバーエラーが発生しました',
    UNKNOWN_ERROR:     'エラーが発生しました',
  }
  return messages[error.code]
}
