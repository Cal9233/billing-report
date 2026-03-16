import nodemailer from "nodemailer";

// For demo purposes, we'll use a test account
// In production, configure with real SMTP credentials
let transporter: nodemailer.Transporter | null = null;

export async function initializeEmailTransport(): Promise<void> {
  if (transporter) {
    return;
  }

  // Use environment variables for SMTP configuration
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development: use Ethereal test account — emails are NOT delivered
    console.warn(
      "SMTP credentials not configured (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS). " +
      "Using Ethereal test transport — emails will NOT be delivered to real recipients."
    );
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
}

export async function sendInvoiceEmail(
  recipientEmail: string,
  invoiceNumber: string,
  customerName: string,
  total: number,
  dueDate: Date,
  organizationName: string
): Promise<boolean> {
  try {
    await initializeEmailTransport();

    if (!transporter) {
      throw new Error("Email transporter not initialized");
    }

    const htmlContent = `
      <h1>Invoice ${invoiceNumber}</h1>
      <p>Dear ${customerName},</p>
      <p>Please find your invoice below:</p>
      <table style="border-collapse: collapse; width: 100%;">
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Invoice Number</th>
          <td style="border: 1px solid #ddd; padding: 8px;">${invoiceNumber}</td>
        </tr>
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Total</th>
          <td style="border: 1px solid #ddd; padding: 8px;">$${total.toFixed(2)}</td>
        </tr>
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Due Date</th>
          <td style="border: 1px solid #ddd; padding: 8px;">${dueDate.toLocaleDateString()}</td>
        </tr>
      </table>
      <p>Please reply to this email if you have any questions.</p>
      <p>Thank you!</p>
      <hr />
      <p style="font-size: 12px; color: #666;">This is an automated email from ${organizationName} via BillFlow</p>
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${organizationName}" <noreply@billflow.local>`,
      to: recipientEmail,
      subject: `Invoice ${invoiceNumber} from ${organizationName}`,
      html: htmlContent,
    });

    console.log("Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

export async function sendOverdueNotice(
  recipientEmail: string,
  invoiceNumber: string,
  customerName: string,
  daysOverdue: number,
  amount: number,
  organizationName: string
): Promise<boolean> {
  try {
    await initializeEmailTransport();

    if (!transporter) {
      throw new Error("Email transporter not initialized");
    }

    const htmlContent = `
      <h1 style="color: #d32f2f;">Payment Reminder - Invoice Overdue</h1>
      <p>Dear ${customerName},</p>
      <p>This is a reminder that your payment is <strong>${daysOverdue} days overdue</strong>.</p>
      <p>
        <strong>Invoice Number:</strong> ${invoiceNumber}<br/>
        <strong>Amount Due:</strong> $${amount.toFixed(2)}<br/>
        <strong>Days Overdue:</strong> ${daysOverdue}
      </p>
      <p>Please arrange payment as soon as possible to avoid any disruption to your account.</p>
      <p>If you have already sent payment, please disregard this notice.</p>
      <p>Thank you for your prompt attention to this matter.</p>
      <hr />
      <p style="font-size: 12px; color: #666;">This is an automated email from ${organizationName} via BillFlow</p>
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${organizationName}" <noreply@billflow.local>`,
      to: recipientEmail,
      subject: `Payment Reminder: Invoice ${invoiceNumber} is Overdue`,
      html: htmlContent,
    });

    console.log("Overdue notice sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Overdue notice send error:", error);
    return false;
  }
}

export async function sendAccessRequestNotification(
  requesterEmail: string,
  submittedAt: string
): Promise<boolean> {
  try {
    await initializeEmailTransport();

    if (!transporter) {
      throw new Error("Email transporter not initialized");
    }

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

    if (!adminEmail) {
      console.warn("ADMIN_NOTIFICATION_EMAIL not set — skipping access request notification");
      return false;
    }

    const htmlContent = `
      <h1>BillFlow &mdash; New Access Request</h1>
      <p>A new user has requested access to BillFlow.</p>
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Email</th>
          <td style="border: 1px solid #ddd; padding: 8px;">${requesterEmail}</td>
        </tr>
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Submitted At</th>
          <td style="border: 1px solid #ddd; padding: 8px;">${submittedAt}</td>
        </tr>
      </table>
      <p>To invite this user, log in to BillFlow and create an invite from the admin panel.</p>
      <hr />
      <p style="font-size: 12px; color: #666;">This is an automated notification from BillFlow.</p>
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BillFlow" <noreply@billflow.local>',
      to: adminEmail,
      subject: "BillFlow — New Access Request",
      html: htmlContent,
    });

    console.log("Access request notification sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Access request notification error:", error);
    return false;
  }
}

export async function sendPasswordResetEmail(
  recipientEmail: string,
  resetUrl: string
): Promise<boolean> {
  try {
    await initializeEmailTransport();

    if (!transporter) {
      throw new Error("Email transporter not initialized");
    }

    const htmlContent = `
      <h1>Reset Your Password</h1>
      <p>You requested a password reset for your BillFlow account.</p>
      <p>Click the link below to set a new password. This link expires in 1 hour.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Reset Password
        </a>
      </p>
      <p style="font-size: 13px; color: #666;">
        If you didn't request this, you can safely ignore this email. Your password will not change.
      </p>
      <hr />
      <p style="font-size: 12px; color: #666;">This is an automated email from BillFlow.</p>
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"BillFlow" <noreply@billflow.local>',
      to: recipientEmail,
      subject: "BillFlow — Reset Your Password",
      html: htmlContent,
    });

    console.log("Password reset email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Password reset email error:", error);
    return false;
  }
}

export async function sendPaymentConfirmation(
  recipientEmail: string,
  invoiceNumber: string,
  customerName: string,
  amountPaid: number,
  paymentDate: Date,
  remainingBalance: number,
  organizationName: string
): Promise<boolean> {
  try {
    await initializeEmailTransport();

    if (!transporter) {
      throw new Error("Email transporter not initialized");
    }

    const htmlContent = `
      <h1 style="color: #2e7d32;">Payment Received</h1>
      <p>Dear ${customerName},</p>
      <p>We have received your payment. Thank you!</p>
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Invoice Number</th>
          <td style="border: 1px solid #ddd; padding: 8px;">${invoiceNumber}</td>
        </tr>
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Amount Paid</th>
          <td style="border: 1px solid #ddd; padding: 8px;">$${amountPaid.toFixed(2)}</td>
        </tr>
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Payment Date</th>
          <td style="border: 1px solid #ddd; padding: 8px;">${paymentDate.toLocaleDateString()}</td>
        </tr>
        <tr>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Remaining Balance</th>
          <td style="border: 1px solid #ddd; padding: 8px;">$${remainingBalance.toFixed(2)}</td>
        </tr>
      </table>
      <p>${remainingBalance === 0 ? "Your invoice has been paid in full. Thank you!" : "Please remit the remaining balance as shown above."}</p>
      <p>Thank you for your business!</p>
      <hr />
      <p style="font-size: 12px; color: #666;">This is an automated email from ${organizationName} via BillFlow</p>
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${organizationName}" <noreply@billflow.local>`,
      to: recipientEmail,
      subject: `Payment Confirmation for Invoice ${invoiceNumber}`,
      html: htmlContent,
    });

    console.log("Payment confirmation sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Payment confirmation send error:", error);
    return false;
  }
}
