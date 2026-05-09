export async function sendWhatsAppTicketConfirmation(
  phoneNumber: string
): Promise<void> {
  const apiUrl = process.env.WATI_API_URL;
  const apiToken = process.env.WATI_API_TOKEN;

  if (!apiUrl || !apiToken) {
    console.warn('[whatsapp] WATI_API_URL or WATI_API_TOKEN not set — skipping WhatsApp send');
    return;
  }

  // Wati expects phone without leading '+': +919884930099 → 919884930099
  const phone = phoneNumber.startsWith('+') ? phoneNumber.slice(1) : phoneNumber;

  const url = `${apiUrl}/api/v1/sendTemplateMessage?whatsappNumber=${phone}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_name: 'confirmation_message_3',
      broadcast_name: 'ticket_booking',
      parameters: [],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Wati API error ${response.status}: ${text}`);
  }
}
