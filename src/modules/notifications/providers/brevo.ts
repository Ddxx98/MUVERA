import { EmailProvider, SendEmailInput, CreateCampaignInput, CampaignResult } from '../types';
import { serverEnv } from '@/config/env.server';

export class BrevoEmailProvider implements EmailProvider {
  readonly name = 'brevo';

  async send(input: SendEmailInput): Promise<string> {
    const apiKey = serverEnv.BREVO_API_KEY;

    if (!apiKey) {
      console.warn('BREVO_API_KEY not configured. Falling back to console output.');
      const consoleMsgId = `brevo_mock_${Date.now()}`;
      console.log(`[BREVO MOCK] Sent to: ${input.to} | Subject: ${input.subject}`);
      return consoleMsgId;
    }

    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: serverEnv.EMAIL_FROM_NAME,
            email: serverEnv.EMAIL_FROM_ADDRESS,
          },
          to: [{ email: input.to }],
          subject: input.subject,
          htmlContent: input.html,
          textContent: input.text,
          tags: input.tags,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[BREVO API ERROR ${res.status}]:`, errorText);

        // Check for Brevo's IP authorization restriction
        if (errorText.includes('unrecognised IP address') || errorText.includes('authorised_ips')) {
          console.warn(
            '[BREVO SECURITY ALERT] Please authorize this IP address in your Brevo dashboard at https://app.brevo.com/security/authorised_ips'
          );
        }

        // In non-production or for graceful user experience, log to console rather than breaking the application flow
        if (serverEnv.NODE_ENV !== 'production') {
          console.warn(`[BREVO FALLBACK] Email logged for ${input.to}: Subject "${input.subject}"`);
          return `brevo_dev_fallback_${Date.now()}`;
        }

        throw new Error(`Brevo email API failed with status ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      return data.messageId || `brevo_${Date.now()}`;
    } catch (err: any) {
      if (serverEnv.NODE_ENV !== 'production') {
        console.warn(`[BREVO NETWORK FALLBACK] ${err.message}. Logging email to console.`);
        return `brevo_dev_fallback_${Date.now()}`;
      }
      throw err;
    }
  }

  /**
   * Creates and optionally triggers an Email Marketing Campaign via Brevo v3 API
   */
  async createCampaign(input: CreateCampaignInput): Promise<CampaignResult> {
    const apiKey = serverEnv.BREVO_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        message: 'BREVO_API_KEY is not configured in .env.local',
      };
    }

    try {
      const payload: any = {
        name: input.name,
        subject: input.subject,
        sender: {
          name: input.senderName || serverEnv.EMAIL_FROM_NAME,
          email: input.senderEmail || serverEnv.EMAIL_FROM_ADDRESS,
        },
        type: 'classic',
        htmlContent: input.htmlContent,
      };

      if (input.listIds && input.listIds.length > 0) {
        payload.recipients = { listIds: input.listIds };
      }

      if (input.scheduledAt) {
        payload.scheduledAt = input.scheduledAt;
      }

      const res = await fetch('https://api.brevo.com/v3/emailCampaigns', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        // response might not be JSON
      }

      if (!res.ok) {
        let msg = `Brevo Campaign creation failed (${res.status}): ${responseText}`;
        if (responseText.includes('unrecognised IP address') || responseText.includes('authorised_ips')) {
          msg = `Brevo requires IP authorization. Please visit https://app.brevo.com/security/authorised_ips to authorize your current IP address.`;
        }
        return {
          success: false,
          message: msg,
          raw: data,
        };
      }

      const campaignId = data.id;

      // If requested to send immediately
      if (input.sendNow && campaignId) {
        const sendRes = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaignId}/sendNow`, {
          method: 'POST',
          headers: {
            'api-key': apiKey,
            'content-type': 'application/json',
          },
        });
        if (!sendRes.ok) {
          const sendErr = await sendRes.text();
          return {
            success: true,
            campaignId,
            message: `Campaign created (ID #${campaignId}), but immediate dispatch returned: ${sendErr}`,
            raw: data,
          };
        }
      }

      return {
        success: true,
        campaignId,
        message: input.sendNow
          ? `Campaign #${campaignId} created and dispatched successfully!`
          : `Campaign #${campaignId} created successfully!`,
        raw: data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Error connecting to Brevo API: ${err.message}`,
      };
    }
  }
}
