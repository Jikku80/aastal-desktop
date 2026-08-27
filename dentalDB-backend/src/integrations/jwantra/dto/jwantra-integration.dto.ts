import { IsOptional, IsUrl, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ConnectJwantraDto {
  /**
   * Jwantra's webhook receiver for this clinic. Optional — Jwantra can also
   * just poll the read endpoints on its own schedule. If provided, a
   * signing secret is generated and returned once alongside the token.
   */
  @IsOptional()
  @IsUrl({ require_tld: false })
  webhookUrl?: string;
}

export class UpdateJwantraWebhookDto {
  /** Replaces the currently configured webhook URL and rotates the secret. */
  @IsOptional()
  @IsUrl({ require_tld: false })
  webhookUrl?: string;
}

/**
 * Links the *other* direction of the integration: the clinic's own
 * Jwantra "external API" key (generated from Jwantra > Settings > API
 * Keys, requires a Jwantra Pro plan), which lets ClinicKarobar call OUT
 * to Jwantra's AI analysis on the clinic's behalf. See
 * JwantraIntegrationService.saveApiKey / ask.
 */
export class LinkJwantraApiKeyDto {
  @IsString()
  @Matches(/^jwk_/, { message: 'That doesn\'t look like a Jwantra API key — it should start with "jwk_". Generate one from Jwantra > Settings > API Keys.' })
  @MinLength(10)
  @MaxLength(200)
  apiKey: string;
}

export class AskJwantraDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  query: string;
}
