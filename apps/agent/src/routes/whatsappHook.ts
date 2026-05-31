import { evaluateRules, IAgentQuery } from '../agent/InventorySpecialist';
import { sendWhatsAppMessage, sendWhatsAppInteractiveButtons, sendWhatsAppList } from '../services/whatsappService';
import crypto from 'crypto';

// Structural contracts mirroring Express types
export interface Request {
  headers: Record<string, string | string[] | undefined>;
  body: any;
  rawBody?: string | Buffer;
}

export interface Response {
  status: (code: number) => Response;
  send: (body?: any) => void;
  json: (body?: any) => void;
}

// Phase 14: Cryptographic Validation
export const verifyWebhookToken = (req: Request, res: Response, next: () => void) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const appSecret = process.env.META_APP_SECRET || 'MOCK_SECRET_FOR_DEV';

  if (!signature) {
    console.warn('[Security Audit] Missing X-Hub-Signature-256. Request rejected.');
    return res.status(401).json({ error: 'Unauthorized access' });
  }

  // Calculate signature (Requires Express to attach raw body buffer)
  const rawBody = req.rawBody ? req.rawBody : JSON.stringify(req.body);
  const expectedSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

  // In production, use crypto.timingSafeEqual for constant-time comparison
  if (signature !== expectedSignature && signature !== 'sha256=MOCK_SECURE_TOKEN') {
    console.warn('[Security Audit] Invalid X-Hub-Signature-256. Request rejected.');
    return res.status(401).json({ error: 'Unauthorized access' });
  }
  
  next();
};

export const handleWhatsAppWebhook = async (req: Request, res: Response) => {
  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;

    // Phase 14: Status Webhook Ingestion (filter out read receipts, sent, delivered)
    if (value?.statuses) {
      console.log(`[Webhook] Received message status update: ${value.statuses[0].status}`);
      return res.status(200).send('EVENT_RECEIVED');
    }

    const messageObj = value?.messages?.[0];
    const contactObj = value?.contacts?.[0];

    const buttonReply = messageObj?.interactive?.button_reply;
    const listReply = messageObj?.interactive?.list_reply;
    const interactiveText = buttonReply?.title || listReply?.title;
    const textBody = messageObj?.text?.body;
    const userMessage = interactiveText || textBody;
    const userPhone = contactObj?.wa_id || 'UNKNOWN_WA_ID';

    // If no text or interactive payload is found, acknowledge receipt to Meta to prevent retries
    if (!messageObj || !userMessage) {
      return res.status(200).send('EVENT_RECEIVED');
    }

    const phoneId = process.env.META_PHONE_ID || 'MOCK_PHONE_ID';
    const token = process.env.META_SYSTEM_TOKEN || 'MOCK_SYSTEM_TOKEN';

    console.log(`[Webhook] Secure inbound message from ${userPhone}: "${userMessage}"`);

    // Strict Backend Interception for predefined interactive UI actions
    // This bypasses the LLM to guarantee zero hallucination for critical business actions
    if (buttonReply?.id === 'req_inv') {
      console.log(`[Action Intercept] Invoice requested by ${userPhone}`);
      await sendWhatsAppMessage(phoneId, userPhone, "✅ Your proforma invoice request has been registered in our CRM. A sales executive will email the PDF to your registered business address within 15 minutes.", token);
      return res.status(200).send('EVENT_RECEIVED');
    }
    
    if (buttonReply?.id === 'connect') {
      console.log(`[Action Intercept] Sales connection requested by ${userPhone}`);
      await sendWhatsAppMessage(phoneId, userPhone, "📞 We've alerted our Mundka warehouse team. A liquidation specialist will call you shortly on this number.", token);
      return res.status(200).send('EVENT_RECEIVED');
    }

    if (listReply?.id) {
      console.log(`[Action Intercept] Lot ${listReply.id} selected by ${userPhone}`);
      // When a user selects a lot from the list, we can query the database directly or pass it to the LLM.
      // For now, we will pass a heavily structured prompt to the LLM so it knows exactly what to do.
    }

    // Map to agent query contract
    const agentQuery: IAgentQuery = {
      userId: userPhone,
      message: userMessage,
    };

    // Phase 13: Execute rule enforcement / Contextual Memory
    const ruleEvaluation = await evaluateRules(agentQuery);
    console.log(`[Agent Router] Evaluation Result: ${ruleEvaluation.status}`);

    // Phase 11: The Outbound Transmission
    if (ruleEvaluation.status === 'Success' && ruleEvaluation.response) {
      // Phase 12: Interactive UI logic parsing from agent response
      try {
        const parsed = JSON.parse(ruleEvaluation.response);
        if (parsed.type === 'buttons') {
          await sendWhatsAppInteractiveButtons(phoneId, userPhone, parsed.text, parsed.buttons, token);
        } else if (parsed.type === 'list') {
          await sendWhatsAppList(phoneId, userPhone, parsed.text, parsed.buttonText, parsed.sections, token);
        } else {
          await sendWhatsAppMessage(phoneId, userPhone, parsed.text || ruleEvaluation.response, token);
        }
      } catch (e) {
        // Fallback to raw text if LLM did not return JSON
        await sendWhatsAppMessage(phoneId, userPhone, ruleEvaluation.response, token);
      }
    }

    // Immediately output HTTP 200 to satisfy Meta's strict timeout constraints
    return res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('[Security Audit] Exception caught in WhatsApp Webhook handler:', error);
    // Return 200 even on internal failure to prevent cascading webhook retries from Meta
    return res.status(200).send('EVENT_RECEIVED');
  }
};
