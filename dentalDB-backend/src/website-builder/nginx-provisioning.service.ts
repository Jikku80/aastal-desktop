import { Injectable, Logger } from '@nestjs/common';
import { exec }               from 'child_process';
import { promisify }          from 'util';
import * as fs                from 'fs/promises';
import * as path              from 'path';

const execAsync = promisify(exec);

/**
 * NginxProvisioningService
 *
 * Automatically provisions an nginx server block + Let's Encrypt SSL cert
 * for a clinic's verified custom domain.
 *
 * Called by WebsiteBuilderService.verifyDomain() after DNS TXT verification
 * succeeds, so clinics never need manual server setup.
 *
 * Requirements on the host:
 *   - certbot installed  (apt install certbot python3-certbot-nginx)
 *   - /var/www/certbot   exists (used for webroot challenge)
 *   - The backend process has sudo access to: certbot, nginx, tee, ln, systemctl
 *     Add to /etc/sudoers.d/clinickarobar:
 *       www-data ALL=(ALL) NOPASSWD: /usr/bin/certbot, /usr/sbin/nginx, \
 *         /usr/bin/tee /etc/nginx/sites-available/*, \
 *         /usr/bin/ln -s /etc/nginx/sites-available/* /etc/nginx/sites-enabled/*, \
 *         /usr/bin/systemctl reload nginx
 */
@Injectable()
export class NginxProvisioningService {
  private readonly logger = new Logger(NginxProvisioningService.name);

  private readonly NGINX_SITES_AVAILABLE = '/etc/nginx/sites-available';
  private readonly NGINX_SITES_ENABLED   = '/etc/nginx/sites-enabled';
  private readonly CERTBOT_WEBROOT       = '/var/www/certbot';
  private readonly NEXT_PORT             = process.env.FRONTEND_PORT || '3002';
  private readonly BACKEND_PORT          = process.env.BACKEND_PORT  || '4000';

  /**
   * Main entry point — call this after domain TXT verification succeeds.
   * Idempotent: safe to call multiple times for the same domain.
   */
  async provisionDomain(domain: string): Promise<{ ok: boolean; message: string }> {
    // Strip www — we handle both with server_name
    const rootDomain = domain.replace(/^www\./, '');

    this.logger.log(`Provisioning nginx + SSL for: ${rootDomain}`);

    try {
      // 1. Obtain SSL cert (skips if cert already exists and is valid)
      await this.obtainSslCert(rootDomain);

      // 2. Write nginx server block
      await this.writeNginxBlock(rootDomain);

      // 3. Enable site (symlink)
      await this.enableSite(rootDomain);

      // 4. Validate nginx config
      await this.testNginxConfig();

      // 5. Reload nginx
      await this.reloadNginx();

      this.logger.log(`✅ Provisioned ${rootDomain} successfully`);
      return { ok: true, message: `Nginx + SSL provisioned for ${rootDomain}` };
    } catch (err: any) {
      this.logger.error(`❌ Provisioning failed for ${rootDomain}: ${err.message}`);
      return { ok: false, message: err.message };
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async obtainSslCert(rootDomain: string): Promise<void> {
    // Check if cert already exists and is valid (not expiring within 30 days)
    const certPath = `/etc/letsencrypt/live/${rootDomain}/fullchain.pem`;
    try {
      await fs.access(certPath);
      // Cert file exists — check expiry
      const { stdout } = await execAsync(
        `openssl x509 -checkend 2592000 -noout -in ${certPath}`,
      );
      this.logger.log(`SSL cert for ${rootDomain} already valid, skipping certbot`);
      return;
    } catch {
      // Either cert doesn't exist, or it's expiring — (re)issue it
    }

    this.logger.log(`Running certbot for ${rootDomain}...`);
    const cmd = [
      'sudo certbot certonly',
      '--webroot',
      `-w ${this.CERTBOT_WEBROOT}`,
      `-d ${rootDomain}`,
      `-d www.${rootDomain}`,
      '--non-interactive',
      '--agree-tos',
      '--email admin@clinickarobar.com',
      '--keep-until-expiring',
      '--quiet',
    ].join(' ');

    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout: 120_000 });
      if (stdout) this.logger.log(`certbot stdout: ${stdout}`);
      if (stderr) this.logger.warn(`certbot stderr: ${stderr}`);
    } catch (err: any) {
      throw new Error(`certbot failed for ${rootDomain}: ${err.stderr || err.message}`);
    }
  }

  private async writeNginxBlock(rootDomain: string): Promise<void> {
    const configPath = path.join(this.NGINX_SITES_AVAILABLE, rootDomain);

    const config = this.generateNginxConfig(rootDomain);

    // Use tee via sudo so we can write to /etc/nginx without running as root
    try {
      await execAsync(`echo '${config.replace(/'/g, "'\\''")}' | sudo tee ${configPath} > /dev/null`);
      this.logger.log(`Wrote nginx config: ${configPath}`);
    } catch (err: any) {
      throw new Error(`Failed to write nginx config: ${err.message}`);
    }
  }

  private async enableSite(rootDomain: string): Promise<void> {
    const src  = path.join(this.NGINX_SITES_AVAILABLE, rootDomain);
    const dest = path.join(this.NGINX_SITES_ENABLED,   rootDomain);

    try {
      await fs.access(dest);
      this.logger.log(`Symlink already exists for ${rootDomain}, skipping`);
    } catch {
      await execAsync(`sudo ln -s ${src} ${dest}`);
      this.logger.log(`Enabled site: ${rootDomain}`);
    }
  }

  private async testNginxConfig(): Promise<void> {
    try {
      await execAsync('sudo nginx -t');
    } catch (err: any) {
      throw new Error(`nginx config test failed: ${err.stderr || err.message}`);
    }
  }

  private async reloadNginx(): Promise<void> {
    try {
      await execAsync('sudo systemctl reload nginx');
      this.logger.log('nginx reloaded');
    } catch (err: any) {
      throw new Error(`nginx reload failed: ${err.message}`);
    }
  }

  private generateNginxConfig(rootDomain: string): string {
    return `# Auto-generated by ClinicKarobar — do not edit manually
# Domain: ${rootDomain}
# Generated: ${new Date().toISOString()}

server {
    listen 80;
    listen [::]:80;
    server_name ${rootDomain} www.${rootDomain};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${rootDomain} www.${rootDomain};

    ssl_certificate     /etc/letsencrypt/live/${rootDomain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${rootDomain}/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 50M;

    proxy_connect_timeout 60s;
    proxy_send_timeout    60s;
    proxy_read_timeout    120s;

    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript image/svg+xml;

    location /api/v1/ {
        proxy_pass http://127.0.0.1:${this.BACKEND_PORT}/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection        "";
        proxy_buffering off;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:${this.BACKEND_PORT}/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=86400" always;
    }

    location /_next/static/ {
        proxy_pass http://127.0.0.1:${this.NEXT_PORT}/_next/static/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    location /_next/image/ {
        proxy_pass http://127.0.0.1:${this.NEXT_PORT}/_next/image/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:${this.NEXT_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # ── Critical: pass original hostname so Next.js middleware and
        #    /site/custom-domain/page.tsx can identify which clinic to load.
        #    Without this header, x-clinic-host is empty and the page 404s.
        proxy_set_header X-Clinic-Host     $host;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }
}
`;
  }
}
