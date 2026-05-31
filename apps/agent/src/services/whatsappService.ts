export const sendWhatsAppMessage = async (
  phoneId: string,
  to: string,
  text: string,
  token: string
) => {
  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      text: { body: text },
    }),
  });
  
  if (!response.ok) {
    const err = await response.text();
    console.error(`[WhatsApp] Failed to send message: ${err}`);
  }
  return response;
};

export const sendWhatsAppInteractiveButtons = async (
  phoneId: string,
  to: string,
  text: string,
  buttons: { id: string, title: string }[],
  token: string
) => {
  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text },
        action: {
          buttons: buttons.map(b => ({
            type: 'reply',
            reply: {
              id: b.id,
              title: b.title
            }
          }))
        }
      }
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[WhatsApp] Failed to send interactive buttons: ${err}`);
  }
  return response;
};

export const sendWhatsAppList = async (
  phoneId: string,
  to: string,
  text: string,
  buttonText: string,
  sections: { title: string, rows: { id: string, title: string, description?: string }[] }[],
  token: string
) => {
  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text },
        action: {
          button: buttonText,
          sections: sections
        }
      }
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[WhatsApp] Failed to send list message: ${err}`);
  }
  return response;
};
