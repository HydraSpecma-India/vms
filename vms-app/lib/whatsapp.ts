export interface WhatsAppNotificationPayload {
  recipientPhone: string;
  visitorName: string;
  companyName: string;
  hostName: string;
  passId: string;
  checkInTime: string;
  photoUrl?: string;
}

export async function sendWhatsAppVisitorAlert(payload: WhatsAppNotificationPayload) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || '';
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

  if (!token || !phoneId) {
    console.log('WhatsApp credentials missing, skipping WhatsApp API call');
    return { success: false, message: 'WhatsApp unconfigured' };
  }

  // Format recipient phone number with country code +91 for India
  let cleanPhone = payload.recipientPhone.replace(/\D/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

  const messageData = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone,
    type: 'text',
    text: {
      preview_url: false,
      body: `🚨 *HYDRASPECMA INDIA - VISITOR ALERT*\n\nHello *${payload.hostName}*,\nYour visitor *${payload.visitorName}* from *${payload.companyName || 'N/A'}* has arrived at reception.\n\n🆔 *Pass ID*: ${payload.passId}\n⏰ *Check-In*: ${payload.checkInTime} (IST)\n\nPlease meet your visitor at the reception desk.`,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    const data = await response.json();
    console.log('WhatsApp API response:', data);
    return { success: response.ok, data };
  } catch (error: any) {
    console.error('WhatsApp API dispatch error:', error);
    return { success: false, error: error.message };
  }
}
