import { getSupabaseClients } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

const templates: Record<string, (data: Record<string, unknown>) => EmailTemplate> = {
  welcome: (data) => ({
    subject: 'Welcome to TMT OFFICIAL eSports!',
    html: `
      <h1>Welcome, ${data.username}!</h1>
      <p>Thank you for registering for TMT OFFICIAL eSports practice-match platform.</p>
      <p>You can now browse and register for Free Fire practice matches.</p>
      <p><a href="${process.env.FRONTEND_URL}/dashboard">Go to Dashboard</a></p>
    `,
    text: `Welcome, ${data.username}! Thank you for registering.`,
  }),
  registration_confirmed: (data) => ({
    subject: `Registration Confirmed: ${data.match_title}`,
    html: `
      <h1>Registration Confirmed</h1>
      <p>You are registered for <strong>${data.match_title}</strong>.</p>
      <p><strong>Scheduled:</strong> ${new Date(data.scheduled_at).toLocaleString()}</p>
      <p><strong>Check-in opens:</strong> ${data.checkin_opens_at ? new Date(data.checkin_opens_at).toLocaleString() : 'TBA'}</p>
      <p><a href="${process.env.FRONTEND_URL}/matches/${data.match_id}">View Match</a></p>
    `,
    text: `Registered for ${data.match_title}. Scheduled: ${data.scheduled_at}`,
  }),
  checkin_reminder: (data) => ({
    subject: `Check-in Reminder: ${data.match_title}`,
    html: `
      <h1>Check-in Opening Soon</h1>
      <p>Check-in for <strong>${data.match_title}</strong> opens in 30 minutes.</p>
      <p><a href="${process.env.FRONTEND_URL}/matches/${data.match_id}/checkin">Check In Now</a></p>
    `,
    text: `Check-in for ${data.match_title} opens soon.`,
  }),
  checkin_confirmed: (data) => ({
    subject: `Check-in Confirmed: ${data.match_title}`,
    html: `
      <h1>Check-in Confirmed</h1>
      <p>You have successfully checked in for <strong>${data.match_title}</strong>.</p>
      <p>Room credentials will be released at the scheduled time.</p>
    `,
    text: `Checked in for ${data.match_title}.`,
  }),
  checkin_missed: (data) => ({
    subject: `Check-in Missed: ${data.match_title}`,
    html: `
      <h1>Check-in Missed</h1>
      <p>You missed the check-in window for <strong>${data.match_title}</strong>.</p>
      <p>Your registration is still active but you cannot access room credentials.</p>
    `,
    text: `Missed check-in for ${data.match_title}.`,
  }),
  credential_released: (data) => ({
    subject: `Room Credentials Released: ${data.match_title}`,
    html: `
      <h1>Room Credentials Available</h1>
      <p>Room credentials for <strong>${data.match_title}</strong> have been released.</p>
      <p><a href="${process.env.FRONTEND_URL}/matches/${data.match_id}/room">View Credentials</a></p>
      <p><strong>WARNING:</strong> Do not share these credentials with anyone.</p>
    `,
    text: `Credentials released for ${data.match_title}. View at dashboard.`,
  }),
  match_cancelled: (data) => ({
    subject: `Match Cancelled: ${data.match_title}`,
    html: `
      <h1>Match Cancelled</h1>
      <p>The match <strong>${data.match_title}</strong> has been cancelled.</p>
      <p>Reason: ${data.reason}</p>
      <p>If you had registered, your registration has been cancelled.</p>
    `,
    text: `Match ${data.match_title} cancelled. Reason: ${data.reason}`,
  }),
  security_alert: (data) => ({
    subject: 'Security Alert - TMT OFFICIAL eSports',
    html: `
      <h1>Security Alert</h1>
      <p>${data.message}</p>
      <p>If this wasn't you, please secure your account immediately.</p>
    `,
    text: `Security Alert: ${data.message}`,
  }),
};

export async function sendEmail(options: {
  to: string;
  subject: string;
  template?: string;
  html?: string;
  text?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabaseClients();

  let html = options.html;
  let text = options.text;
  let subject = options.subject;

  if (options.template && templates[options.template]) {
    const rendered = templates[options.template](options.data || {});
    subject = options.subject || rendered.subject;
    html = html || rendered.html;
    text = text || rendered.text;
  }

  if (!html || !text) {
    throw new Error('Email content (html/text) is required');
  }

  // Queue email for Cloudflare Worker
  const { error } = await supabase.notif.from('email_queue').insert({
    to_email: options.to,
    subject: subject,
    html_body: html,
    text_body: text,
    status: 'PENDING',
    scheduled_at: new Date().toISOString(),
  });

  if (error) {
    logger.error('Failed to queue email', { error: error.message, to: options.to });
    throw new Error('Failed to queue email');
  }

  logger.info('Email queued', { to: options.to, subject });
}

export async function sendEmailDirect(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  // Direct send via Cloudflare Worker (for immediate sends)
  const response = await fetch(process.env.EMAIL_WORKER_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.EMAIL_API_TOKEN}`,
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error('Direct email send failed', { error, to: options.to });
    throw new Error('Failed to send email directly');
  }
}