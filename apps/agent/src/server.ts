import * as http from 'node:http';
import { handleWhatsAppWebhook, verifyWebhookToken, Request as MockRequest, Response as MockResponse } from './routes/whatsappHook';

const PORT = 3000;

const server = http.createServer((req, res) => {
  // Route matching for the WhatsApp webhook
  if (req.method === 'POST' && req.url === '/api/webhook/whatsapp') {
    let rawData = '';

    // Accumulate data chunks
    req.on('data', chunk => {
      rawData += chunk.toString();
    });

    req.on('end', () => {
      let parsedBody = {};
      try {
        if (rawData) {
          parsedBody = JSON.parse(rawData);
        }
      } catch (e) {
        console.error('[Security Audit] Invalid JSON payload intercepted.');
      }

      // Map the native Node.js HTTP request to our structural contract
      const mappedReq: MockRequest = {
        headers: req.headers as Record<string, string | string[] | undefined>,
        body: parsedBody
      };

      // Map the native Node.js HTTP response to our structural contract
      const mappedRes: MockResponse = {
        status: (code: number) => {
          res.statusCode = code;
          return mappedRes;
        },
        send: (body?: any) => {
          res.end(body ? String(body) : undefined);
        },
        json: (body?: any) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(body ? JSON.stringify(body) : undefined);
        }
      };

      // Enforce the Hostile Auditor middleware
      verifyWebhookToken(mappedReq, mappedRes, () => {
        // Pass control to the main webhook router upon successful verification
        handleWhatsAppWebhook(mappedReq, mappedRes);
      });
    });
  } else {
    // Drop all other traffic
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`[Security Audit] Warey Agent Live Native HTTP Server initialized on port ${PORT}...`);
  console.log(`[Route Locked] POST /api/webhook/whatsapp is active and requiring token verification.`);
});
