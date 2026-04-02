import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function isSmtpConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_USER !== "placeholder" &&
    process.env.SMTP_PASS
  );
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!isSmtpConfigured()) {
    console.log(`[EMAIL] To: ${to}, Subject: ${subject}`);
    console.log(`[EMAIL] Body: ${html}`);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "noreply@sozluk.com",
    to,
    subject,
    html,
  });
}

export { isSmtpConfigured };
