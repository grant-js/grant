import { SupportedLocale } from '@grantjs/i18n';
import mjml from 'mjml';

import { config } from '@/config';
import { translateStatic } from '@/i18n';

export interface EmailTemplateParams {
  locale: SupportedLocale;
  primaryColor?: string;
  logoUrl?: string;
  companyName?: string;
}

export interface BaseEmailTemplateProps extends EmailTemplateParams {
  subject: string;
  children: string;
  footerWarning?: string;
}

export function renderBaseEmailTemplate(props: BaseEmailTemplateProps): string {
  const {
    locale,
    primaryColor = '#2563eb',
    logoUrl,
    companyName = 'Grant',
    subject,
    children,
    footerWarning,
  } = props;

  const mjmlTemplate = `
    <mjml>
      <mj-head>
        <mj-title>${subject}</mj-title>
        <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
        <mj-raw>
          <meta name="color-scheme" content="light dark">
          <meta name="supported-color-schemes" content="light dark">
        </mj-raw>
        <mj-attributes>
          <mj-all font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" />
          <mj-text font-size="16px" line-height="24px" color="#4B5563" />
          <mj-button background-color="${primaryColor}" color="white" font-weight="600" />
        </mj-attributes>
        <mj-style>
          :root {
            color-scheme: light dark;
            supported-color-schemes: light dark;
          }

          .primary-color { color: ${primaryColor}; }
          .bg-primary { background-color: ${primaryColor}; }
          .border-primary { border-color: ${primaryColor}; }
          
          /* Link styling */
          .link-url {
            color: ${primaryColor} !important;
            text-decoration: none !important;
            word-break: break-all;
            font-size: 13px;
          }

          /* Logo container */
          .logo-container {
            display: inline-block;
          }

          /* Default: show black logo (for clients without media query support) */
          .logo-light {
            display: block !important;
            max-width: 140px;
            height: auto;
          }
          .logo-dark {
            display: none !important;
            max-height: 0 !important;
            overflow: hidden !important;
          }

          /* Light mode: show black logo */
          @media (prefers-color-scheme: light) {
            .logo-light {
              display: block !important;
            }
            .logo-dark {
              display: none !important;
              max-height: 0 !important;
              overflow: hidden !important;
            }
          }

          /* Dark mode: show white logo */
          @media (prefers-color-scheme: dark) {
            .logo-light {
              display: none !important;
              max-height: 0 !important;
              overflow: hidden !important;
            }
            .logo-dark {
              display: block !important;
            }
          }
        </mj-style>
      </mj-head>

      <mj-body background-color="#F9FAFB">
        <!-- Header Section -->
        <mj-section padding="40px 0px">
          <mj-column>
            <mj-raw>
              <div style="text-align: center;">
                <div class="logo-container">
                  <!--[if !mso]><!-->
                  <img src="${logoUrl || `${config.security.frontendUrl}/grant-logo-black.png`}" alt="${companyName}" width="120" class="logo-light" />
                  <img src="${logoUrl || `${config.security.frontendUrl}/grant-logo-white.png`}" alt="${companyName}" width="120" class="logo-dark" />
                  <!--<![endif]-->
                  <!--[if mso]>
                  <img src="${logoUrl || `${config.security.frontendUrl}/grant-logo-white.png`}" alt="${companyName}" width="120" style="display: block; max-width: 140px; height: auto;" />
                  <![endif]-->
                </div>
              </div>
            </mj-raw>
          </mj-column>
        </mj-section>

        <!-- Content Section -->
        <mj-wrapper padding="0">
          <mj-section padding="20px 0">
            <mj-column width="520px">
              ${children}
            </mj-column>
          </mj-section>
        </mj-wrapper>

        <!-- Footer Section -->
        <mj-wrapper padding="0">
          <mj-section padding="0px">
            <mj-column width="520px">
              <mj-divider border-color="#E5E7EB" border-width="1px" padding="0 0 20px 0" />
              ${
                footerWarning
                  ? `<mj-text align="center" font-size="13px" color="#6B7280" line-height="20px" padding="0 0 15px 0">
                ${footerWarning}
              </mj-text>`
                  : `<mj-text align="center" font-size="13px" color="#9CA3AF" line-height="20px" padding="0 0 5px 0">
                ${translateStatic('email.common.footer.noRequest', locale)}
              </mj-text>
              <mj-text align="center" font-size="13px" color="#9CA3AF" line-height="20px" padding="0 0 15px 0">
                ${translateStatic('email.common.footer.typo', locale)}
              </mj-text>`
              }
              <mj-text align="center" font-size="12px" color="#D1D5DB" padding="0">
                ${companyName}
              </mj-text>
            </mj-column>
          </mj-section>
        </mj-wrapper>
      </mj-body>
    </mjml>
  `;

  const { html } = mjml(mjmlTemplate);
  return html;
}

export function createButton(
  url: string,
  text: string,
  variant: 'primary' | 'secondary' = 'primary'
): string {
  const backgroundColor = variant === 'primary' ? '#2563eb' : '#6B7280';

  return `
    <mj-button 
      href="${url}" 
      background-color="${backgroundColor}" 
      color="#ffffff"
      border-radius="6px" 
      padding="12px 0" 
      font-size="16px" 
      font-weight="600"
      align="center"
      inner-padding="14px 32px"
    >
      ${text}
    </mj-button>
  `;
}

export function createAlternativeLink(url: string, locale: SupportedLocale): string {
  return `
    <mj-text font-size="13px" color="#6B7280" padding="20px 0 5px 0">
      <strong>${translateStatic('email.common.alternativeText', locale)}</strong>
    </mj-text>
    <mj-wrapper padding="0">
      <mj-section padding="0">
        <mj-column >
          <mj-text font-size="12px" color="#2563eb" padding="0" css-class="link-url">
            <a href="${url}" style="color: #2563eb; text-decoration: none; word-break: break-all;">${url}</a>
          </mj-text>
        </mj-column>
      </mj-section>
    </mj-wrapper>
  `;
}
