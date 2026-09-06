import nodemailer from 'nodemailer';

interface GoogleLoginEmailParams {
  email: string;
  name: string;
  ipAddress: string;
  userAgent: string;
  dateTime: string;
}

interface OtpEmailParams {
  email: string;
  name: string;
  otp: string;
}

interface LoginSuccessEmailParams {
  email: string;
  name: string;
  loginMethod: string; // 'Email & Password' | 'Google'
  dateTime: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private smtpConfigured: boolean = false;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    // Support both naming conventions: SMTP_* (legacy) and EMAIL_* (current .env.example)
    const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
    const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
    const user = process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

    const isRealCredentials =
      !!(host &&
      user &&
      pass &&
      !user.includes('your_email') &&
      !pass.includes('your_app_password') &&
      !user.includes('your_email@gmail.com'));

    this.smtpConfigured = isRealCredentials;

    if (isRealCredentials) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
          connectionTimeout: 10000, // 10s connection timeout
          greetingTimeout: 10000,   // 10s greeting timeout
          socketTimeout: 15000,     // 15s socket timeout
          tls: {
            rejectUnauthorized: false,
          },
        });
        console.log(`[EmailService] SMTP configured: ${user} via ${host}:${port}`);
      } catch (error) {
        this.smtpConfigured = false;
        // Fallback to JSON transport (no-op in development)
        this.transporter = nodemailer.createTransport({
          jsonTransport: true,
        });
      }
    } else {
      // SMTP credentials are not configured — use no-op JSON transport.
      // OTPs will be logged to the server console instead.
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      console.warn('[EmailService] SMTP not configured. OTPs will be printed to console only.');
    }
  }

  /**
   * Send Google Login Security Notification Email asynchronously.
   * Does NOT throw or block login execution if email dispatch fails.
   */
  public async sendGoogleLoginSecurityNotification(params: GoogleLoginEmailParams): Promise<void> {
    const { email, name, ipAddress, userAgent, dateTime } = params;
    const fromEmail = process.env.SMTP_FROM || process.env.FROM_EMAIL || process.env.EMAIL_FROM || 'security@aicrm.com';

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #2563eb; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">AICRM Security Alert</h1>
        </div>
        <div style="padding: 32px; color: #1e293b; line-height: 1.6;">
          <p style="font-size: 16px; margin-top: 0;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #475569;">
            This is a security notification confirming that your AICRM account was successfully accessed using <strong>Google Sign-In</strong>.
          </p>
          
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="margin-top: 0; color: #0f172a; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Login Details</h3>
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 160px;">Authentication Method:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 500;">Google Sign-In</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Date &amp; Time:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 500;">${dateTime}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">IP Address:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 500;">${ipAddress}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Browser / Device:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 500;">${userAgent}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            If this login was performed by you, no further action is required.
          </p>
          <p style="font-size: 13px; color: #dc2626; font-weight: 600;">
            If you do not recognize this activity, immediately secure your account by changing your password (if applicable) and contacting support.
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
          <p style="font-size: 13px; color: #94a3b8; margin-bottom: 0;">
            Thank you,<br />
            <strong>AICRM Security Team</strong>
          </p>
        </div>
      </div>
    `;

    try {
      if (!this.transporter) this.initTransporter();

      const mailOptions = {
        from: `"AICRM Security" <${fromEmail}>`,
        to: email,
        subject: 'Successfully Logged In to Your AICRM Account',
        html: htmlContent,
      };

      const info = await this.transporter?.sendMail(mailOptions);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[EmailService] Security notification sent to ${email}. MessageId: ${info?.messageId || 'JSON-Simulated'}`);
      }
    } catch (err: any) {
      // Async safety: Log error on server without crashing auth response
      console.error(`[EmailService Error] Failed to send Google login security email to ${email}:`, err.message);
    }
  }

  /**
   * Send Login Success Email asynchronously.
   * Used for BOTH normal email/password login and Google login.
   * Non-critical: never throws, so it can never break the login response.
   */
  public async sendLoginSuccessEmail(params: LoginSuccessEmailParams): Promise<void> {
    const { email, name, loginMethod, dateTime } = params;
    const fromEmail = process.env.SMTP_FROM || process.env.FROM_EMAIL || process.env.EMAIL_FROM || 'noreply@aicrm.com';
    const subject =
      loginMethod === 'Google'
        ? 'Welcome Back to AI CRM — Google Login Successful'
        : 'Welcome Back to AI CRM — Login Successful';

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d58d8 100%); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">Welcome Back, ${name}!</h1>
        </div>
        <div style="padding: 32px; color: #1e293b; line-height: 1.6;">
          <p style="font-size: 15px; margin-top: 0;">Your login was successful and your account is now active.</p>

          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 140px;">Login method:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 500;">${loginMethod}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Date &amp; Time:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 500;">${dateTime}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            If this was you, no further action is required.
          </p>
          <p style="font-size: 13px; color: #dc2626; font-weight: 600;">
            If you did not perform this login, please secure your account immediately by changing your password or contacting support.
          </p>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
          <p style="font-size: 13px; color: #94a3b8; margin-bottom: 0;">
            Thank you for using AI CRM.<br />
            <strong>AI CRM Team</strong>
          </p>
        </div>
      </div>
    `;

    try {
      if (!this.transporter) this.initTransporter();

      const info = await this.transporter?.sendMail({
        from: `"AI CRM" <${fromEmail}>`,
        to: email,
        subject,
        html: htmlContent,
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log(`[EmailService] Login success email sent to ${email}. MessageId: ${info?.messageId || 'JSON-Simulated'}`);
      }
    } catch (err: any) {
      // Non-critical — must NEVER throw, login must succeed regardless of email delivery
      console.error(`[EmailService Error] Failed to send login success email to ${email}:`, err.message);
    }
  }

  /**
   * Send Email Change OTP Code asynchronously.
   */
  public async sendEmailChangeOtp(params: OtpEmailParams): Promise<void> {
    const { email, name, otp } = params;
    const fromEmail = process.env.SMTP_FROM || process.env.FROM_EMAIL || process.env.EMAIL_FROM || 'security@aicrm.com';

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; color: #1e293b;">
        <h2 style="color: #2563eb; margin-top: 0; font-size: 20px;">Email Verification Code</h2>
        <p style="font-size: 14px;">Hello <strong>${name}</strong>,</p>
        <p style="font-size: 14px; color: #475569;">
          You requested to change your email address on AICRM. Your verification OTP code is:
        </p>
        <div style="background-color: #f1f5f9; text-align: center; font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #1e293b; padding: 16px; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #64748b;">
          This code is valid for 10 minutes. If you did not request an email change, please ignore this message.
        </p>
      </div>
    `;

    try {
      if (!this.transporter) this.initTransporter();

      await this.transporter?.sendMail({
        from: `"AICRM Security" <${fromEmail}>`,
        to: email,
        subject: 'Your AICRM Email Verification Code',
        html: htmlContent,
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[EmailService] Email change OTP sent to ${email}`);
      }
    } catch (err: any) {
      console.error(`[EmailService Error] Failed to send email change OTP to ${email}:`, err.message);
    }
  }

  /**
   * Send Password Reset OTP Code — professional HTML email for forgot password flow ONLY.
   *
   * This email is sent exclusively for password recovery.
   * It must never be sent for login, registration, or any other purpose.
   */
  public async sendForgotPasswordOtp(params: OtpEmailParams): Promise<void> {
    const { email, name, otp } = params;
    const fromEmail = process.env.SMTP_FROM || process.env.FROM_EMAIL || process.env.EMAIL_FROM || 'noreply@aicrm.com';

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d58d8 100%); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Password Reset Code</h1>
          <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">AI CRM Platform</p>
        </div>
        <div style="padding: 40px 32px; color: #1e293b; line-height: 1.6;">
          <p style="font-size: 16px; margin-top: 0; margin-bottom: 8px;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 15px; color: #475569; margin-bottom: 24px;">
            We received a request to reset the password for your AI CRM account.
            Use the verification code below to proceed.
          </p>
          
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); text-align: center; font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #2563eb; padding: 28px 24px; border-radius: 12px; margin: 28px 0; border: 2px solid #2563eb; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.1);">
            ${otp}
          </div>

          <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="font-size: 13px; color: #0369a1; margin: 0;">
              ⏱ This code expires in <strong>2 minutes</strong>.
              Enter it quickly on the verification page.
            </p>
          </div>

          <p style="font-size: 14px; color: #64748b; margin-bottom: 24px;">
            If you did not request a password reset, please ignore this email.
            Your password will remain unchanged.
          </p>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="font-size: 13px; color: #92400e; margin: 0; font-weight: 500;">
              <strong>Security Notice:</strong> Never share this code with anyone, including AI CRM support staff.
              We will never ask you for this code.
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
          <p style="font-size: 13px; color: #94a3b8; margin-bottom: 0;">
            Regards,<br />
            <strong>AI CRM Security Team</strong>
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">
            This is an automated security email. Please do not reply to this message.
          </p>
        </div>
      </div>
    `;

    try {
      if (!this.transporter) this.initTransporter();

      if (!this.smtpConfigured) {
        // SMTP is not configured — log OTP to server console for development/testing.
        // This allows the forgot-password flow to complete without real email credentials.
        // In production, configure SMTP_USER and SMTP_PASS with real Gmail App Password.
        console.log('\n' + '='.repeat(60));
        console.log('[DEV] Password Reset OTP for:', email);
        console.log('[DEV] OTP Code:', otp);
        console.log('[DEV] Name:', name);
        console.log('[DEV] Expires in: 2 minutes');
        console.log('='.repeat(60) + '\n');
        // Do NOT throw — flow must continue even without email delivery
        return;
      }

      const info = await this.transporter?.sendMail({
        from: `"AI CRM Security" <${fromEmail}>`,
        to: email,
        subject: '🔐 Password Reset Verification Code — AI CRM',
        html: htmlContent,
      });

      console.log(`[EmailService] Password reset OTP sent to ${email}. MessageId: ${info?.messageId || 'N/A'}`);
    } catch (err: any) {
      console.error(`[EmailService Error] Failed to send password reset OTP to ${email}:`, err.message);
      throw err;
    }
  }
}

export const emailService = new EmailService();
export default emailService;