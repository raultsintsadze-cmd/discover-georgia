/**
 * Outbound transactional email abstraction. Default implementation:
 * Resend. Mirrors StorageProvider/VideoProvider — one concrete class per
 * vendor, selected by which file a caller imports.
 */
export interface EmailProvider {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>;
}
