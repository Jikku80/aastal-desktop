import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

/**
 * One row per clinic that has connected Jwantra. This is deliberately its
 * own table rather than reusing `api_keys`: the generic ApiKeysModule is an
 * Enterprise-plan developer feature (see ApiKeysService.assertEnterprise),
 * whereas this is a first-party sibling-product integration that should be
 * available to any clinic regardless of plan, and it carries a couple of
 * extra fields (webhook URL + signing secret) the generic key model doesn't
 * have.
 *
 * Mirrors the trust model documented on the Jwantra side
 * (app/connectors/clinickarobar.py): a long-lived, clinic-revocable bearer
 * token, no OAuth redirect, no refresh flow.
 */
export enum JwantraIntegrationStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
}

@Entity('jwantra_integrations')
@Index(['clinicId'], { unique: true })
export class JwantraIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  /** SHA-256 hash of the bearer token — the raw token is never stored. */
  @Column({ unique: true })
  tokenHash: string;

  /** First 8 chars of the raw token, for display in the settings UI. */
  @Column({ length: 8 })
  tokenPrefix: string;

  @Column({ type: 'varchar', length: 20, default: JwantraIntegrationStatus.ACTIVE })
  status: JwantraIntegrationStatus;

  /**
   * Jwantra's inbound webhook endpoint for this clinic, e.g.
   * "https://api.jwantra.com/connectors/clinickarobar/webhook". Optional —
   * without it we simply never dispatch, and Jwantra keeps working by
   * polling the read endpoints below on its own schedule.
   */
  @Column({ nullable: true })
  webhookUrl: string;

  /**
   * AES-256-GCM-encrypted webhook signing secret (see utils/secret-crypto).
   * Stored reversibly, unlike tokenHash, because we need the plaintext
   * value to compute the outbound HMAC signature on every dispatch.
   */
  @Column({ nullable: true, type: 'text' })
  encryptedWebhookSecret: string;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @Column({ default: 0 })
  requestCount: number;

  /**
   * AES-256-GCM-encrypted Jwantra "external API" key (jwk_...) — the
   * *reverse* direction from everything else on this entity. Everything
   * above lets Jwantra call INTO ClinicKarobar (pull patients/services/
   * invoices); this is what lets ClinicKarobar call OUT to Jwantra's
   * `POST /api/v1/external/ask` (see JwantraIntegrationService.ask) so a
   * clinic can see Jwantra's AI analysis of its own synced data without
   * leaving ClinicKarobar. The clinic generates this key themselves from
   * Jwantra's own Settings > API Keys screen (Pro plan required there -
   * see app/apikeys/router.py on the Jwantra side) and pastes it in;
   * there's no API on Jwantra's side for ClinicKarobar to mint one
   * automatically, since Jwantra doesn't expose an OAuth flow for this.
   * Stored reversibly (like encryptedWebhookSecret above, via the same
   * secret-crypto util) because the plaintext has to be sent as the
   * X-API-Key header on every proxied request.
   */
  @Column({ nullable: true, type: 'text' })
  encryptedJwantraApiKey: string;

  /** First 12 chars of the raw Jwantra API key (e.g. "jwk_live_ab1"), for display only. */
  @Column({ nullable: true, length: 12 })
  jwantraApiKeyPrefix: string;

  /** When the Jwantra API key was linked (or last re-linked). Null until step 2 of connect is done. */
  @Column({ nullable: true })
  jwantraApiKeyLinkedAt: Date;

  @Column({ nullable: true })
  lastWebhookDispatchAt: Date;

  @Column({ nullable: true })
  lastWebhookError: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
