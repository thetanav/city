import React from "react";

type TicketLineItem = {
  tierName: string;
  qty: number;
  unitPrice: number;
};

export type TicketConfirmationEmailProps = {
  userName: string;
  eventTitle: string;
  eventDate: string;
  eventEndDate?: string;
  eventLocation: string;
  tickets: TicketLineItem[];
  totalAmount: number;
  dashboardUrl: string;
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
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function TicketConfirmationEmail({
  userName,
  eventTitle,
  eventDate,
  eventEndDate,
  eventLocation,
  tickets,
  totalAmount,
  dashboardUrl,
}: TicketConfirmationEmailProps) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          backgroundColor: "#f6f7fb",
          color: "#111827",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          padding: "24px 12px",
        }}
      >
        <table
          align="center"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ maxWidth: 560, backgroundColor: "#ffffff", borderRadius: 10 }}
        >
          <tbody>
            <tr>
              <td style={{ padding: "24px", borderBottom: "1px solid #e5e7eb" }}>
                <h1 style={{ margin: 0, fontSize: 22 }}>Ticket confirmed</h1>
                <p style={{ margin: "8px 0 0", color: "#4b5563", fontSize: 14 }}>
                  {eventTitle}
                </p>
              </td>
            </tr>
            <tr>
              <td style={{ padding: "20px 24px" }}>
                <p style={{ margin: 0, fontSize: 15 }}>Hi {userName},</p>
                <p style={{ margin: "10px 0 0", color: "#4b5563", fontSize: 14, lineHeight: 1.5 }}>
                  Your payment is successful. Your tickets are ready.
                </p>

                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{eventTitle}</p>
                  <p style={{ margin: "8px 0 0", color: "#4b5563", fontSize: 13 }}>
                    {formatDate(eventDate)}
                    {eventEndDate ? ` to ${formatDate(eventEndDate)}` : ""}
                  </p>
                  <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: 13 }}>
                    {eventLocation}
                  </p>
                </div>

                <table
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{ marginTop: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f9fafb" }}>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, color: "#6b7280" }}>
                        Ticket
                      </th>
                      <th style={{ padding: "10px 12px", textAlign: "center", fontSize: 12, color: "#6b7280" }}>
                        Qty
                      </th>
                      <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, color: "#6b7280" }}>
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket, index) => (
                      <tr key={`${ticket.tierName}-${index}`}>
                        <td style={{ padding: "10px 12px", borderTop: "1px solid #e5e7eb", fontSize: 13 }}>
                          {ticket.tierName}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            borderTop: "1px solid #e5e7eb",
                            textAlign: "center",
                            fontSize: 13,
                          }}
                        >
                          {ticket.qty}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            borderTop: "1px solid #e5e7eb",
                            textAlign: "right",
                            fontSize: 13,
                          }}
                        >
                          {formatMoney(ticket.qty * ticket.unitPrice)}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ padding: "12px", borderTop: "1px solid #e5e7eb", fontWeight: 600 }} colSpan={2}>
                        Total
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          borderTop: "1px solid #e5e7eb",
                          textAlign: "right",
                          fontWeight: 600,
                        }}
                      >
                        {formatMoney(totalAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ marginTop: 18 }}>
                  <a
                    href={dashboardUrl}
                    style={{
                      display: "inline-block",
                      backgroundColor: "#111827",
                      color: "#ffffff",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                      padding: "10px 16px",
                      borderRadius: 6,
                    }}
                  >
                    View tickets
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td
                style={{
                  padding: "16px 24px 22px",
                  borderTop: "1px solid #e5e7eb",
                  color: "#6b7280",
                  fontSize: 12,
                }}
              >
                City Events · This is an automated confirmation email.
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
