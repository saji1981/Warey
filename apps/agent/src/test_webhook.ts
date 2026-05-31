import crypto from 'crypto';

/**
 * Phase 9 & 14: Integration Testing Utility
 * Simulates nested inbound payloads from the Meta WhatsApp Cloud API to validate the Agent Webhook,
 * calculating the correct X-Hub-Signature-256 to bypass the security middleware.
 */

const sendPayload = async (messageObj: any, description: string) => {
  const metaPayload = {
    entry: [{
      changes: [{
        value: {
          contacts: [{ wa_id: "919876543210" }],
          messages: [messageObj]
        }
      }]
    }]
  };

  const rawBody = JSON.stringify(metaPayload);
  const appSecret = process.env.META_APP_SECRET || 'MOCK_SECRET_FOR_DEV';
  const signature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

  console.log(`\n--- [Test Harness] ${description} ---`);
  
  try {
    const response = await fetch('http://127.0.0.1:3000/api/webhook/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature 
      },
      body: rawBody
    });

    const status = response.status;
    const text = await response.text();

    console.log(`[Status]: ${status}`);
    console.log(`[Response Body]: ${text}`);

    if (status === 200 && text === 'EVENT_RECEIVED') {
      console.log("[Test Harness] SUCCESS: Webhook accepted the payload.");
    } else {
      console.error("[Test Harness] FAILURE: Unexpected response format or rejection.");
    }
  } catch (error) {
    console.error("[Test Harness] Network Error. Verify agent server is running on port 3000:", error);
  }
};

const runTests = async () => {
  // Test 1: Standard LLM Context Query (Checking Stock)
  await sendPayload({
    text: { body: "Is there any stock available for electronics?" }
  }, "Testing Standard Text Query");

  // Test 2: Interactive Button Interception (Request Invoice)
  await sendPayload({
    interactive: {
      type: "button_reply",
      button_reply: { id: "req_inv", title: "Request Invoice" }
    }
  }, "Testing Interactive Button Intercept (req_inv)");
};

runTests();
