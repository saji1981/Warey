import { check_live_stock, get_bulk_price } from '../tools/InventoryTools';

export const INVENTORY_SPECIALIST_PROMPT = `
You are the Warey "Inventory Specialist", a B2B liquidation market assistant operating via WhatsApp.
Your primary role is to assist verified buyers with stock availability and bulk pricing inquiries.

STRICT HOSTILE AUDITOR CONSTRAINTS:
1. ZERO HALLUCINATION: NEVER guess or estimate prices or stock availability. You have NO authority to change or interpolate the data received from the tools.
2. UNAVAILABLE STATE: If the tool data returns 0 for a price or "Product Not Found" for stock, you MUST strictly inform the user that the information is unavailable.
3. PRICE LOCKDOWN: You are explicitly FORBIDDEN from offering unauthorized discounts.
4. Finality: State clearly that all bulk liquidation pricing is final.

INTERACTIVE UI CONSTRAINTS (Phase 12):
To utilize WhatsApp's rich interactive features, you must format your output as raw JSON (without markdown block wrappers) in the following scenarios:
- If stock is found and you are providing a price/availability update, you MUST return a JSON object with buttons:
  {"type": "buttons", "text": "<Your message here>", "buttons": [{"id": "req_inv", "title": "Request Invoice"}, {"id": "connect", "title": "Connect to Sales"}]}
- If the user asks "What lots are available?" or asks to see the catalog, return a JSON list:
  {"type": "list", "text": "Please select a lot to view details:", "buttonText": "View Lots", "sections": [{"title": "Available Lots", "rows": [{"id": "lot_1", "title": "Mixed Electronics", "description": "Amazon Returns"}, {"id": "lot_2", "title": "Kitchen Appliances", "description": "Faber & Elica Hobs"}]}]}
- For all other standard conversational responses where buttons or lists aren't appropriate, return plain text as normal (not JSON).
`;

export interface IAgentQuery {
  userId: string;
  message: string;
}

// Phase 13: Contextual Memory (Session State Management)
const sessionStore = new Map<string, Array<{role: string, content: string}>>();

export const processQuery = async (query: IAgentQuery) => {
  const normalizedMessage = query.message.toLowerCase();
  
  // Basic session retrieval
  const history = sessionStore.get(query.userId) || [];
  history.push({ role: 'user', content: query.message });

  // Retain only the last 5 interactions to prevent token overflow
  if (history.length > 10) history.splice(0, history.length - 10);
  sessionStore.set(query.userId, history);

  const targetSku = '00000000-0000-0000-0000-000000000123'; 
  let toolContext = "No specific tool data required.";

  if (normalizedMessage.includes('price') || normalizedMessage.includes('discount')) {
    const price = await get_bulk_price(targetSku);
    toolContext = `TOOL RESULT [get_bulk_price for ${targetSku}]: ${price}`;
  } else if (normalizedMessage.includes('stock') || normalizedMessage.includes('available')) {
    const stock = await check_live_stock(targetSku);
    toolContext = `TOOL RESULT [check_live_stock for ${targetSku}]: ${stock}`;
  }

  const historyText = history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n');

  const fullSystemPrompt = `
${INVENTORY_SPECIALIST_PROMPT}
TOOL CONTEXT: ${toolContext}
CONVERSATION HISTORY:
${historyText}
  `;

  try {
    const apiKey = process.env.GOOGLE_API_KEY?.trim();
    if (!apiKey) {
      console.error('[Security Audit] CRITICAL: GOOGLE_API_KEY is undefined in the environment.');
    } else {
      console.log('[Diagnostic] API Key Status: Loaded');
    }
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullSystemPrompt }] }],
        generationConfig: {
          temperature: 0.0 // Enforcing zero variance
        }
      })
    });

    if (!response.ok) {
      console.error(`[Security Audit] Gemini API Error: ${response.status}`);
      return { status: "Error", response: "System offline. Unable to retrieve data." };
    }

    const data = await response.json();
    let finalLLMResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Data formatting error.";

    // Strip out markdown code blocks if the LLM wrapped the JSON
    if (finalLLMResponse.startsWith('```json')) {
      finalLLMResponse = finalLLMResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (finalLLMResponse.startsWith('```')) {
      finalLLMResponse = finalLLMResponse.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // Append assistant response to history
    history.push({ role: 'assistant', content: finalLLMResponse });
    sessionStore.set(query.userId, history);

    return { status: "Success", response: finalLLMResponse };

  } catch (error) {
    console.error(`[Security Audit] Exception during Gemini fetch:`, error);
    return { status: "Error", response: "System offline. Unable to retrieve data." };
  }
};

export const evaluateRules = processQuery;
