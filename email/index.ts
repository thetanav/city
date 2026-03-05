import { renderToStaticMarkup } from "react-dom/server";
import { Resend } from "resend";
import { createElement } from "react";

import {
  TicketConfirmationEmail,
  type TicketConfirmationEmailProps,
} from "@/email/templates/ticket-confirmation";

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

function buildDashboardUrl(eventSlug: string) {
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "";

  if (!siteUrl) return "";

  try {
    return new URL(`/e/${eventSlug}`, siteUrl).toString();
  } catch {
    return siteUrl;
  }
}

function renderTicketEmail(data: TicketConfirmationEmailProps) {
  return `<!DOCTYPE html>${renderToStaticMarkup(createElement(TicketConfirmationEmail, data))}`;
}

export async function sendTicketConfirmationEmail(data: TicketEmailData) {
  const totalQty = data.tickets.reduce((sum, t) => sum + t.qty, 0);
  const subject = `Your ${totalQty} ticket${totalQty !== 1 ? "s" : ""} for ${data.eventTitle}`;

  const html = renderTicketEmail({
    userName: data.userName,
    eventTitle: data.eventTitle,
    eventDate: data.eventDate,
    eventEndDate: data.eventEndDate,
    eventLocation: data.eventLocation,
    tickets: data.tickets,
    totalAmount: data.totalAmount,
    dashboardUrl: buildDashboardUrl(data.eventSlug),
  });

  const { data: result, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject,
    html,
  });

  if (error) {
    console.error("[email] Failed to send ticket confirmation:", error);
    return { success: false, error };
  }

  return { success: true, id: result?.id };
}
