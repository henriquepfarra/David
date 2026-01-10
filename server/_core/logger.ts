/**
 * Logger condicional que só loga em desenvolvimento
 * Em produção, apenas console.error é permitido para erros críticos
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Loga mensagens de debug - apenas em desenvolvimento
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Loga mensagens informativas - apenas em desenvolvimento
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Loga avisos - sempre loga
   */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Loga erros - sempre loga
   */
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
};
