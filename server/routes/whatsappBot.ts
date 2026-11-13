import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();

const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE_NUMBER || '918522000504';
const STORE_NAME = process.env.STORE_NAME || 'Youth Choice The Fashion Store';
const UPI_ID = process.env.UPI_ID || '8522000504@ybl';
const WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'youth_choice_bot_secret_token_2026';

// Helper to generate dynamic UPI QR code URL
export function generateUPIQRCode(amount: number, orderNumber: string, customUpiId?: string) {
  const upiId = customUpiId || UPI_ID;
  const payeeName = 'YouthChoiceMensWear';
  const cleanOrder = orderNumber.replace(/[^a-zA-Z0-9]/g, '');
  const upiUri = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amount}&cu=INR&tn=Order_${cleanOrder}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(upiUri)}`;
  return { upiUri, qrUrl };
}

// Helper to format AI WhatsApp payment response payload
export function formatAIPaymentBotMessage(orderNumber?: string, customerName?: string, amount?: number) {
  let targetOrder = null;
  if (orderNumber) {
    targetOrder = db.data.orders.find(o => o.order_number.toUpperCase() === orderNumber.toUpperCase());
  }

  const finalAmount = amount || (targetOrder ? targetOrder.grand_total : 0);
  const name = customerName || (targetOrder ? targetOrder.customer_name : 'Valued Customer');
  const ordNo = orderNumber || (targetOrder ? targetOrder.order_number : 'PAYMENT');

  const { upiUri, qrUrl } = generateUPIQRCode(finalAmount, ordNo);

  let message = `🤖 *YOUTH CHOICE AI PAYMENT BOT*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `👋 Hello ${name}!\n\n`;

  if (targetOrder) {
    message += `Thank you for your order *#${ordNo}* at *${STORE_NAME}*!\n\n`;
    message += `📦 *Order Amount:* ₹${finalAmount.toLocaleString()}\n`;
    message += `📍 *Delivery:* ${targetOrder.delivery_address.slice(0, 40)}...\n\n`;
  } else if (finalAmount > 0) {
    message += `Here is your payment request for *₹${finalAmount.toLocaleString()}* (${ordNo}).\n\n`;
  } else {
    message += `Welcome to *${STORE_NAME}* Payment Assistant!\n\n`;
  }

  message += `💳 *UPI PAYMENT DETAILS:*\n`;
  message += `• *GPay / PhonePe / Paytm Number:* 8522000504\n`;
  message += `• *UPI ID:* ${UPI_ID}\n`;
  message += `• *Direct Tap to Pay:* ${upiUri}\n\n`;
  message += `🖼️ *SCANNABLE QR CODE IMAGE:* \n${qrUrl}\n\n`;
  message += `⚡ *HOW TO PAY IN 3 EASY STEPS:*\n`;
  message += `1️⃣ Open Google Pay, PhonePe, Paytm, or BHIM.\n`;
  message += `2️⃣ Scan the QR Code image above (or enter UPI ID: \`${UPI_ID}\`).\n`;
  message += `3️⃣ Pay exact amount *₹${finalAmount > 0 ? finalAmount.toLocaleString() : '---'}* and reply with a screenshot of the receipt here!\n\n`;
  message += `Once payment screenshot is verified, your order status will be updated immediately to *CONFIRMED* and dispatched for delivery! 🚀`;

  return {
    message,
    qr_code_url: qrUrl,
    upi_uri: upiUri,
    upi_id: UPI_ID,
    amount: finalAmount,
    order_number: ordNo
  };
}

// 1. WhatsApp Webhook Verification (For Meta WhatsApp Cloud API)
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
      console.log('✅ WhatsApp Webhook verified successfully');
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }
  res.status(400).json({ error: 'Invalid webhook request parameters' });
});

// 2. WhatsApp Webhook Receiver for Auto-Responding with Payment QR Code
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Check if it's a WhatsApp message event
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messageObj = value?.messages?.[0];

      if (messageObj) {
        const fromPhone = messageObj.from; // Customer phone number
        const textBody = messageObj.text?.body || '';

        console.log(`💬 Received WhatsApp message from ${fromPhone}: "${textBody}"`);

        // Check if message asks for QR code, payment, or includes order number (e.g. YC-12345)
        const orderMatch = textBody.match(/YC-\d{5}/i);
        const isPaymentQuery = /qr|pay|payment|upi|gpay|phonepe|cost|price|order/i.test(textBody);

        if (orderMatch || isPaymentQuery) {
          const matchedOrderNo = orderMatch ? orderMatch[0].toUpperCase() : undefined;
          const botPayload = formatAIPaymentBotMessage(matchedOrderNo);

          console.log(`🤖 AI Bot generated QR payment response for ${fromPhone}: Order ${botPayload.order_number}`);

          // If META WhatsApp API environment variables exist, send live WhatsApp message
          if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
            try {
              // Send text message with QR link
              await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  recipient_type: 'individual',
                  to: fromPhone,
                  type: 'image',
                  image: {
                    link: botPayload.qr_code_url,
                    caption: botPayload.message
                  }
                })
              });
            } catch (apiErr) {
              console.error('Failed sending Meta WhatsApp API message:', apiErr);
            }
          }
        }
      }
    }

    // Always acknowledge receipt to WhatsApp API
    res.status(200).send('EVENT_RECEIVED');
  } catch (err: any) {
    console.error('Error handling WhatsApp webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Direct API Endpoint to Trigger AI WhatsApp Payment QR Bot
router.post('/send-qr-bot', (req: Request, res: Response) => {
  try {
    const { order_number, phone, amount, customer_name } = req.body;

    const botPayload = formatAIPaymentBotMessage(order_number, customer_name, amount);
    const targetPhone = phone || WHATSAPP_PHONE;

    // Generate direct WhatsApp click URL for immediate user redirection or share
    const encodedMessage = encodeURIComponent(botPayload.message);
    const directWhatsappUrl = `https://wa.me/${targetPhone}?text=${encodedMessage}`;

    // Log AI Bot activity
    db.data.analytics_events.push({
      id: `evt-bot-${Date.now()}`,
      event_type: 'AI_WHATSAPP_QR_BOT_SENT',
      user_id: 'SYSTEM',
      metadata: JSON.stringify({
        order_number: botPayload.order_number,
        phone: targetPhone,
        amount: botPayload.amount
      }),
      created_at: new Date().toISOString()
    });
    db.save();

    res.json({
      success: true,
      bot_name: 'Youth Choice AI Payment Bot',
      phone: targetPhone,
      order_number: botPayload.order_number,
      amount: botPayload.amount,
      upi_id: botPayload.upi_id,
      upi_uri: botPayload.upi_uri,
      qr_code_url: botPayload.qr_code_url,
      whatsapp_message: botPayload.message,
      whatsapp_url: directWhatsappUrl
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
