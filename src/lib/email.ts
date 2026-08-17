import { prisma } from "@/lib/prisma";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail({ to, subject, text, html }: SendEmailInput) {
  await prisma.devEmail.create({
    data: { to, subject, text, html },
  });

  if (process.env.NODE_ENV !== "production") {
    console.info(`[email] ${subject} → ${to}\n${text}\n`);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Chamber <noreply@localhost>",
      to,
      subject,
      text,
      html: html ?? `<p>${text.replaceAll("\n", "<br />")}</p>`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Failed to send email via Resend:", body);
  }
}

export function emailShell(title: string, body: string, href: string, cta: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#0e0d0b;color:#f3efe6;font-family:Georgia,serif;">
    <div style="max-width:560px;margin:32px auto;padding:32px;background:#171512;border:1px solid #2a261f;border-radius:16px;">
      <p style="letter-spacing:.2em;text-transform:uppercase;color:#c4a35a;font-size:12px;">Chamber</p>
      <h1 style="font-size:28px;margin:12px 0 16px;">${title}</h1>
      <p style="line-height:1.6;color:#c9c2b6;">${body}</p>
      <p style="margin:28px 0;">
        <a href="${href}" style="display:inline-block;background:#c4a35a;color:#1a160f;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:600;">${cta}</a>
      </p>
      <p style="font-size:12px;color:#9a9286;">If the button does not work, copy this URL:<br />${href}</p>
    </div>
  </body>
</html>`;
}
