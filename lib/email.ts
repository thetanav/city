import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM_EMAIL = "CITY <onboarding@resend.dev>";

type TicketEmailData = {
  to: string;
  userName: string;
  eventTitle: string;
  eventDate: string;
  eventEndDate?: string;
  eventLocation: string;
  tickets: {
    tierName: string;
    qty: number;
    unitPrice: number;
  }[];
  totalAmount: number;
  eventSlug: string;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function buildTicketEmailHtml(data: TicketEmailData) {
  const ticketRows = data.tickets
    .map(
      (t) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">
          ${t.tierName}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; text-align: center;">
          ${t.qty}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; text-align: right;">
          ${formatMoney(t.unitPrice * t.qty)}
        </td>
      </tr>`,
    )
    .join("");

  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Ticket Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #111827; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">
                Ticket Confirmed
              </h1>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 14px;">
                You're all set for ${data.eventTitle}
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 40px 16px;">
              <p style="margin: 0; font-size: 16px; color: #111827;">
                Hey ${data.userName},
              </p>
              <p style="margin: 12px 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                Your payment was successful and your tickets are confirmed. Here are the details for your upcoming event.
              </p>
            </td>
          </tr>

          <!-- Event Details -->
          <tr>
            <td style="padding: 16px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #111827;">
                      ${data.eventTitle}
                    </h2>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #6b7280; vertical-align: top; width: 28px;">
                          &#128197;
                        </td>
                        <td style="padding: 4px 0; font-size: 14px; color: #374151;">
                          ${formatDate(data.eventDate)}${data.eventEndDate ? ` &mdash; ${formatDate(data.eventEndDate)}` : ""}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #6b7280; vertical-align: top; width: 28px;">
                          &#128205;
                        </td>
                        <td style="padding: 4px 0; font-size: 14px; color: #374151;">
                          ${data.eventLocation}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Ticket Breakdown -->
          <tr>
            <td style="padding: 16px 40px;">
              <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: 0.05em;">
                Your Tickets
              </h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 10px 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-align: left; text-transform: uppercase; letter-spacing: 0.05em;">Tier</th>
                    <th style="padding: 10px 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-align: center; text-transform: uppercase; letter-spacing: 0.05em;">Qty</th>
                    <th style="padding: 10px 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-align: right; text-transform: uppercase; letter-spacing: 0.05em;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${ticketRows}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #111827;">
                      Total
                    </td>
                    <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">
                      ${formatMoney(data.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 24px 40px; text-align: center;">
              <a href="${siteUrl}" style="display: inline-block; padding: 12px 32px; background-color: #111827; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                View My Tickets
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                This is an automated confirmation from City Events.
                <br />
                Your QR code ticket is available in your dashboard.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendTicketConfirmationEmail(data: TicketEmailData) {
  const totalQty = data.tickets.reduce((sum, t) => sum + t.qty, 0);
  const subject = `Your ${totalQty} ticket${totalQty !== 1 ? "s" : ""} for ${data.eventTitle}`;

  const { data: result, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject,
    html: buildTicketEmailHtml(data),
  });

  if (error) {
    console.error("[email] Failed to send ticket confirmation:", error);
    return { success: false, error };
  }

  return { success: true, id: result?.id };
}
