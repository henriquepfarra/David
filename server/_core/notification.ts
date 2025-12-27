/**
 * DEPRECATED: Manus/Forge Notification Service
 * 
 * Este módulo foi desabilitado pois dependia da infraestrutura Manus/Forge.
 * Para notificações, considere usar:
 * - Email (Nodemailer, SendGrid)
 * - Webhook
 * - Slack/Discord
 */

import { TRPCError } from "@trpc/server";

export type NotificationPayload = {
  title: string;
  content: string;
};

/**
 * Placeholder for notification functionality.
 * Currently returns false indicating notification was not sent.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  console.warn(
    "[Notification] Manus notification service foi removido. " +
    "Implemente uma solução alternativa (email, webhook, etc)."
  );
  return false;
}
