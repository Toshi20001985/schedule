type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: unknown
}

class Logger {
  private log(level: LogLevel, message: string, data?: unknown) {
    if (level === 'debug' && process.env.NODE_ENV === 'production') return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data !== undefined && { data }),
    }

    // Vercel / Next.js のサーバーログとして構造化ログを出力
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry))
  }

  debug = (message: string, data?: unknown) => this.log('debug', message, data)
  info  = (message: string, data?: unknown) => this.log('info',  message, data)
  warn  = (message: string, data?: unknown) => this.log('warn',  message, data)
  error = (message: string, data?: unknown) => this.log('error', message, data)
}

export const logger = new Logger()
