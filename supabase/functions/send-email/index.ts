/**
 * Supabase Edge Function: send-email
 *
 * Sends transactional emails via Resend API.
 * Used for: welcome emails, order confirmations, rider assignments,
 * application updates, admin notifications.
 *
 * POST body:
 *   { template: string, to: string, data?: Record<string, unknown> }
 *
 * Templates:
 *   - welcome          → new user welcome
 *   - order_confirmed  → order placed
 *   - order_delivered   → delivery complete
 *   - rider_assigned    → rider matched to order
 *   - application_approved → rider/merchant approved
 *   - application_rejected → rider/merchant rejected
 *   - admin_created     → admin created your account
 *   - custom            → { subject, html } in data
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FROM = 'AtlaasGo <noreply@atlaasgo.com>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/* ── Email templates ──────────────────────────────────────────────── */

const BRAND = {
  primary: '#FF5722',
  bg: '#1A1410',
  surface: '#231E19',
  fg: '#F5F0EB',
  soft: '#A89E94',
};

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:32px;">
    <span style="font-size:24px;font-weight:800;color:${BRAND.fg};letter-spacing:-0.5px;">
      <span style="color:${BRAND.primary};">Atlas</span>Go
    </span>
  </div>
  <div style="background:${BRAND.surface};border-radius:20px;padding:32px 28px;border:1px solid rgba(255,255,255,0.06);">
    ${body}
  </div>
  <div style="text-align:center;margin-top:24px;font-size:12px;color:${BRAND.soft};">
    AtlaasGo — Ifrane's premium delivery, redefined.<br>
    AUI Campus · Ifrane · Morocco
  </div>
</div>
</body></html>`;
}

function btn(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;padding:12px 28px;background:${BRAND.primary};color:white;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;margin-top:16px;">${text}</a>`;
}

type TemplateData = Record<string, unknown>;

function getTemplate(template: string, data: TemplateData): { subject: string; html: string } | null {
  const name = (data.name as string) ?? 'there';
  const appUrl = (data.app_url as string) ?? 'https://atlaasgo.com';

  switch (template) {
    case 'welcome':
      return {
        subject: 'Welcome to AtlaasGo! 🎉',
        html: layout('Welcome', `
          <h2 style="color:${BRAND.fg};margin:0 0 12px;font-size:20px;">Welcome, ${name}!</h2>
          <p style="color:${BRAND.soft};font-size:14px;line-height:1.6;margin:0 0 16px;">
            Your AtlaasGo account is ready. Order from 28+ restaurants in Ifrane,
            track your rider in real-time, and get campus delivery in under 22 minutes.
          </p>
          <p style="color:${BRAND.soft};font-size:14px;line-height:1.6;margin:0 0 8px;">
            <strong style="color:${BRAND.fg};">First order?</strong> Free delivery on us.
          </p>
          ${btn('Start ordering →', `${appUrl}/order`)}
        `),
      };

    case 'admin_created':
      return {
        subject: 'Your AtlaasGo account has been created',
        html: layout('Account Created', `
          <h2 style="color:${BRAND.fg};margin:0 0 12px;font-size:20px;">Hey ${name}!</h2>
          <p style="color:${BRAND.soft};font-size:14px;line-height:1.6;margin:0 0 16px;">
            An admin has created an AtlaasGo account for you. Here are your credentials:
          </p>
          <div style="background:rgba(255,87,34,0.08);border-radius:12px;padding:16px;margin:0 0 16px;">
            <div style="font-size:12px;color:${BRAND.soft};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Email</div>
            <div style="color:${BRAND.fg};font-weight:700;font-size:15px;">${data.email ?? ''}</div>
            ${data.temp_password ? `
            <div style="font-size:12px;color:${BRAND.soft};text-transform:uppercase;letter-spacing:0.1em;margin:12px 0 6px;">Temporary password</div>
            <div style="color:${BRAND.primary};font-weight:700;font-size:15px;font-family:monospace;">${data.temp_password}</div>
            ` : ''}
            ${data.role && data.role !== 'customer' ? `
            <div style="font-size:12px;color:${BRAND.soft};text-transform:uppercase;letter-spacing:0.1em;margin:12px 0 6px;">Role</div>
            <div style="color:${BRAND.fg};font-weight:700;font-size:15px;">${data.role}</div>
            ` : ''}
          </div>
          <p style="color:${BRAND.soft};font-size:13px;line-height:1.6;margin:0 0 8px;">
            Please sign in and change your password as soon as possible.
          </p>
          ${btn('Sign in →', `${appUrl}/auth`)}
        `),
      };

    case 'order_confirmed':
      return {
        subject: `Order confirmed — ${data.restaurant ?? 'your food'} is being prepared! 🍽️`,
        html: layout('Order Confirmed', `
          <h2 style="color:${BRAND.fg};margin:0 0 12px;font-size:20px;">Order confirmed!</h2>
          <p style="color:${BRAND.soft};font-size:14px;line-height:1.6;margin:0 0 16px;">
            <strong style="color:${BRAND.fg};">${data.restaurant ?? 'The restaurant'}</strong> is preparing your order.
            ${data.items_count ? `${data.items_count} items · ` : ''}${data.total ? `${data.total} dh` : ''}
          </p>
          <p style="color:${BRAND.soft};font-size:14px;line-height:1.6;margin:0 0 8px;">
            Estimated delivery: <strong style="color:${BRAND.fg};">${data.eta ?? '20-30 min'}</strong>
          </p>
          ${data.order_id ? btn('Track order →', `${appUrl}/track/${data.order_id}`) : ''}
        `),
      };

    case 'order_delivered':
      return {
        subject: 'Your order has been delivered! ✅',
        html: layout('Delivered', `
          <h2 style="color:${BRAND.fg};margin:0 0 12px;font-size:20px;">Delivered!</h2>
          <p style="color:${BRAND.soft};font-size:14px;line-height:1.6;margin:0 0 16px;">
            Your order from <strong style="color:${BRAND.fg};">${data.restaurant ?? 'the restaurant'}</strong> has arrived.
            Enjoy your meal!
          </p>
          <p style="color:${BRAND.soft};font-size:14px;line-height:1.6;margin:0 0 8px;">
            How was the experience? Rate your order to help the community.
          </p>
          ${data.order_id ? btn('Rate your order →', `${appUrl}/orders`) : ''}
        `),
      };

    case 'rider_assigned':
      return {
        subject: 'A rider is on the way! 🏍️',
        html: layout('Rider Assigned', `
          <h2 style="color:${BRAND.fg};margin:0 0 12px;font-size:20px;">Rider assigned!</h2>
          <p style="color:${BRAND.soft};font-size:14px;line-height:1.6;margin:0 0 16px;">
            <strong style="color:${BRAND.fg};">${data.rider_name ?? 'Your rider'}</strong> is picking up your order.
            Track them in real-time.
          </p>
          ${data.order_id ? btn('Track live →', `${appUrl}/track/${data.order_id}`) : ''}
        `),
      };

    case 'application_approved':
      return {
        subject: `You're approved! Welcome to the AtlaasGo team 🎉`,
        html: layout('Application Approved', `
          <h2 style="color:${BRAND.fg};margin:0 0 12px;font-size:20px;">You're in, ${name}!</h2>
          <p style="color:${BRAND.soft};font-size:14px;line-height:1.6;margin:0 0 16px;">
            Your ${data.type ?? ''} application has been approved. Welcome to the AtlaasGo platform!
          </p>
          <p style="color:${BRAND.soft};font-size:14px;line-height:1.6;margin:0 0 8px;">
            Sign in to access your ${data.type === 'rider' ? 'rider dashboard' : 'merchant panel'}.
          </p>
          ${btn('Get started →', `${appUrl}/${data.type === 'rider' ? 'rider' : 'merchant'}`)}
        `),
      };

    case 'application_rejected':
      return {
        subject: 'Update on your AtlaasGo application',
        html: layout('Application Update', `
          <h2 style="color:${BRAND.fg};margin:0 0 12px;font-size:20px;">Hi ${name},</h2>
          <p style="color:${BRAND.soft};font-size:14px;line-height:1.6;margin:0 0 16px;">
            After reviewing your ${data.type ?? ''} application, we're unable to approve it at this time.
            ${data.reason ? `<br><br><strong style="color:${BRAND.fg};">Reason:</strong> ${data.reason}` : ''}
          </p>
          <p style="color:${BRAND.soft};font-size:14px;line-height:1.6;margin:0 0 8px;">
            You can reapply anytime. If you have questions, reach out to our team.
          </p>
        `),
      };

    case 'custom':
      return {
        subject: (data.subject as string) ?? 'AtlaasGo',
        html: layout((data.subject as string) ?? 'AtlaasGo', data.html as string ?? ''),
      };

    default:
      return null;
  }
}

/* ── Main handler ─────────────────────────────────────────────────── */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const { template, to, data = {} } = body;

    if (!template || !to) {
      return json({ error: 'template and to are required' }, 400);
    }

    const email = getTemplate(template, data);
    if (!email) {
      return json({ error: `Unknown template: ${template}` }, 400);
    }

    // Send via Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: Array.isArray(to) ? to : [to],
        subject: email.subject,
        html: email.html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('Resend error:', result);
      return json({ error: result.message ?? 'Failed to send email' }, res.status);
    }

    return json({ ok: true, id: result.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});
