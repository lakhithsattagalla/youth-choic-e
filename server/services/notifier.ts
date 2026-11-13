import nodemailer from 'nodemailer';

export interface OtpNotificationParams {
  email: string;
  phone?: string;
  otp: string;
  purpose: 'login' | 'register';
}

export interface OtpDeliveryResult {
  sentEmail: boolean;
  sentSms: boolean;
  emailError?: string;
  smsError?: string;
}

// Helper functions for secure server logging without leaking full PII or OTP
function maskEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = local.length <= 2 ? local + '***' : local[0] + '***' + local[local.length - 1];
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length <= 4) return '****';
  return digits.slice(0, 2) + '*'.repeat(digits.length - 4) + digits.slice(-2);
}

/**
 * 1. Email OTP Dispatcher (Supports Nodemailer SMTP or Resend REST API)
 */
async function sendEmailOtp(email: string, otp: string): Promise<{ success: boolean; error?: string }> {
  const storeName = process.env.STORE_NAME || "Youth Choice The Fashion Store";
  const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || 'no-reply@youthchoice.com';

  const resendApiKey = process.env.RESEND_API_KEY || process.env.EMAIL_PROVIDER_API_KEY;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PROVIDER_API_KEY;

  const emailSubject = `Your ${storeName} Verification Code`;
  const emailText = `Your verification code is: ${otp}\n\nThis OTP expires in 5 minutes.\n\nDo not share this OTP with anyone.`;
  const emailHtml = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0c; color: #ffffff; padding: 32px; border-radius: 20px; border: 1px solid #27272a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #f59e0b; color: #000000; font-weight: 900; font-size: 24px; padding: 10px 18px; border-radius: 12px; letter-spacing: 1px;">YC</div>
        <h2 style="color: #ffffff; margin-top: 14px; margin-bottom: 4px; font-size: 20px; letter-spacing: 1px; text-transform: uppercase;">${storeName}</h2>
        <p style="color: #a1a1aa; font-size: 12px; margin: 0;">Account Security Verification</p>
      </div>
      <div style="background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 24px; text-align: center;">
        <p style="color: #d4d4d8; font-size: 14px; margin-top: 0; margin-bottom: 12px;">Your verification code is:</p>
        <div style="font-family: monospace; font-size: 40px; font-weight: 900; letter-spacing: 8px; color: #fbbf24; background: #000000; padding: 16px 24px; border-radius: 12px; border: 1px solid #f59e0b; display: inline-block; margin: 12px 0;">
          ${otp}
        </div>
        <p style="color: #f59e0b; font-size: 12px; font-weight: 700; margin-top: 16px; margin-bottom: 4px;">This OTP expires in 5 minutes.</p>
        <p style="color: #71717a; font-size: 11px; margin: 0;">Do not share this OTP with anyone.</p>
      </div>
    </div>
  `;

  // Option A: Resend REST API
  if (resendApiKey && resendApiKey.startsWith('re_')) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: `${storeName} <${fromAddress}>`,
          to: [email],
          subject: emailSubject,
          text: emailText,
          html: emailHtml
        })
      });

      if (response.ok) {
        console.log(`[OTP Email] Successfully sent OTP email via Resend to ${maskEmail(email)}`);
        return { success: true };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.message || response.statusText || 'Resend API delivery failed';
        console.error(`[OTP Email Error] Resend API error for ${maskEmail(email)}:`, msg);
        return { success: false, error: `Resend Email API Error: ${msg}` };
      }
    } catch (err: any) {
      console.error(`[OTP Email Error] Resend API fetch failed for ${maskEmail(email)}:`, err.message);
      return { success: false, error: `Resend API network error: ${err.message}` };
    }
  }

  // Option B: Nodemailer SMTP
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        family: 4, // Force IPv4 connection to prevent Windows IPv6 ENETUNREACH errors
        tls: {
          rejectUnauthorized: false
        }
      } as any);

      const info = await transporter.sendMail({
        from: `"${storeName}" <${fromAddress}>`,
        to: email,
        subject: emailSubject,
        text: emailText,
        html: emailHtml
      });

      if (info && (info.messageId || (info.accepted && info.accepted.length > 0))) {
        console.log(`[OTP Email] Successfully sent OTP email via SMTP (${smtpHost}) to ${maskEmail(email)}`);
        return { success: true };
      } else {
        console.error(`[OTP Email Error] SMTP server rejected message to ${maskEmail(email)}`);
        return { success: false, error: 'SMTP server rejected message' };
      }
    } catch (err: any) {
      console.error(`[OTP Email Error] SMTP error for ${maskEmail(email)}:`, err.message);
      return { success: false, error: `SMTP Dispatch Error: ${err.message}` };
    }
  }

  // Unconfigured
  const configError = 'Email OTP service is not configured. Missing required environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS or RESEND_API_KEY / EMAIL_PROVIDER_API_KEY).';
  console.warn(`[OTP Email Warning] ${configError}`);
  return { success: false, error: configError };
}

/**
 * 2. SMS OTP Dispatcher (Supports Fast2SMS, Twilio, MSG91, or Custom REST Gateway)
 */
async function sendSmsOtp(phone: string, otp: string): Promise<{ success: boolean; error?: string }> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (!cleanPhone) {
    return { success: false, error: 'No mobile phone number provided.' };
  }

  const smsMessage = `Youth Choice The Fashion Store: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code.`;
  const maskedP = maskPhone(cleanPhone);

  const smsApiKey = process.env.SMS_PROVIDER_API_KEY;
  const smsUrl = process.env.SMS_PROVIDER_URL;
  const smsSenderId = process.env.SMS_PROVIDER_SENDER_ID || 'YOUTHCH';

  const fast2smsKey = process.env.FAST2SMS_API_KEY || (smsUrl?.includes('fast2sms') ? smsApiKey : null);
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  // Provider 1: Fast2SMS (India)
  if (fast2smsKey) {
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': fast2smsKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: cleanPhone
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.return === true) {
        console.log(`[OTP SMS] Fast2SMS delivered OTP to ${maskedP}`);
        return { success: true };
      } else {
        const msg = data.message ? (Array.isArray(data.message) ? data.message.join(', ') : data.message) : 'Fast2SMS dispatch failed';
        console.error(`[OTP SMS Error] Fast2SMS error for ${maskedP}:`, msg);
        return { success: false, error: `Fast2SMS Error: ${msg}` };
      }
    } catch (err: any) {
      console.error(`[OTP SMS Error] Fast2SMS network error for ${maskedP}:`, err.message);
      return { success: false, error: `Fast2SMS network error: ${err.message}` };
    }
  }

  // Provider 2: Twilio
  if (twilioSid && twilioAuthToken && twilioPhone) {
    try {
      const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : (cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`);
      const auth = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: twilioPhone,
          Body: smsMessage
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && (data.status === 'queued' || data.status === 'sent' || data.sid)) {
        console.log(`[OTP SMS] Twilio queued/sent OTP to ${maskedP}`);
        return { success: true };
      } else {
        const msg = data.message || 'Twilio SMS dispatch failed';
        console.error(`[OTP SMS Error] Twilio error for ${maskedP}:`, msg);
        return { success: false, error: `Twilio Error: ${msg}` };
      }
    } catch (err: any) {
      console.error(`[OTP SMS Error] Twilio network error for ${maskedP}:`, err.message);
      return { success: false, error: `Twilio network error: ${err.message}` };
    }
  }

  // Provider 3: Custom REST SMS Gateway
  if (smsUrl && smsApiKey) {
    try {
      const response = await fetch(smsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${smsApiKey}`,
          'x-api-key': smsApiKey
        },
        body: JSON.stringify({
          to: cleanPhone,
          sender: smsSenderId,
          message: smsMessage,
          otp
        })
      });
      if (response.ok) {
        console.log(`[OTP SMS] Custom SMS gateway sent OTP to ${maskedP}`);
        return { success: true };
      } else {
        const errText = await response.text().catch(() => '');
        console.error(`[OTP SMS Error] Custom SMS gateway error for ${maskedP}:`, response.status, errText);
        return { success: false, error: `SMS Gateway HTTP ${response.status}: ${errText}` };
      }
    } catch (err: any) {
      console.error(`[OTP SMS Error] Custom SMS gateway error for ${maskedP}:`, err.message);
      return { success: false, error: `SMS Gateway network error: ${err.message}` };
    }
  }

  // Unconfigured
  const configError = 'SMS OTP service is not configured. Missing required environment variables (SMS_PROVIDER_API_KEY & SMS_PROVIDER_URL, FAST2SMS_API_KEY, or TWILIO_ACCOUNT_SID).';
  console.warn(`[OTP SMS Warning] ${configError}`);
  return { success: false, error: configError };
}

/**
 * Main Dispatcher: Sends OTP via Email and/or SMS, returns individual delivery statuses
 */
export async function sendOtpNotification({
  email,
  phone,
  otp,
  purpose
}: OtpNotificationParams): Promise<OtpDeliveryResult> {
  const [emailRes, smsRes] = await Promise.all([
    sendEmailOtp(email, otp),
    phone ? sendSmsOtp(phone, otp) : Promise.resolve({ success: false, error: 'No mobile phone number provided.' })
  ]);

  return {
    sentEmail: emailRes.success,
    sentSms: smsRes.success,
    emailError: emailRes.error,
    smsError: smsRes.error
  };
}
