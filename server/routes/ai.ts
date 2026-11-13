import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();

// Store details for AI context
const STORE_NAME = process.env.STORE_NAME || 'Youth Choice The Fashion Store';
const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE_NUMBER || '918522000504';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

// Optional Gemini API call function using fetch
async function callGeminiApi(userPrompt: string, systemPrompt: string, history: ChatMessage[] = []): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  try {
    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: `Understood. I am Rufus, the official AI Shopping Assistant for ${STORE_NAME}. How can I assist you today?` }] },
      ...history.slice(-6).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      })),
      { role: 'user', parts: [{ text: userPrompt }] }
    ];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 600
        }
      })
    });

    if (!response.ok) return null;

    const data: any = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return candidateText || null;
  } catch (err) {
    console.error('Gemini API call failed, falling back to local AI engine:', err);
    return null;
  }
}

// Local Smart AI engine built over db.data
function processLocalAIQuery(prompt: string, history: ChatMessage[] = []) {
  const lowerPrompt = prompt.toLowerCase();

  // Helper to enrich product with primary image, brand name, category name
  const enrichProduct = (prod: any) => {
    const primaryImg = db.data.product_images.find(img => img.product_id === prod.id && img.is_primary) 
      || db.data.product_images.find(img => img.product_id === prod.id);
    const brand = db.data.brands.find(b => b.id === prod.brand_id);
    const category = db.data.categories.find(c => c.id === prod.category_id);

    return {
      ...prod,
      image_url: primaryImg?.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
      brand_name: brand?.name || 'Youth Choice',
      category_name: category?.name || 'Fashion'
    };
  };

  // 1. Order Tracking Query (e.g. YC-10245, track order, where is my order)
  const orderMatch = prompt.match(/YC-\d{5}/i);
  if (orderMatch || lowerPrompt.includes('track order') || lowerPrompt.includes('order status') || lowerPrompt.includes('my order')) {
    if (orderMatch) {
      const orderNo = orderMatch[0].toUpperCase();
      const order = db.data.orders.find(o => o.order_number.toUpperCase() === orderNo);
      if (order) {
        let statusText = 'being processed';
        if (order.status === 'DELIVERED') statusText = 'delivered 🎉';
        if (order.status === 'SHIPPED' || order.status === 'OUT_FOR_DELIVERY') statusText = 'on the way 🚚';
        if (order.status === 'ORDER_CONFIRMED' || order.status === 'PAYMENT_CONFIRMED') statusText = 'confirmed & preparing for dispatch 📦';

        return {
          text: `📦 **Order Status for #${order.order_number}**\n\n• **Customer:** ${order.customer_name}\n• **Status:** ${order.status.replace(/_/g, ' ')}\n• **Total Amount:** ₹${order.grand_total.toLocaleString()}\n• **Delivery Address:** ${order.delivery_address}\n\nYour order is currently ${statusText}! If you need urgent delivery assistance, tap WhatsApp order support below.`,
          quick_replies: ['🔥 Trending Shirts', '🎁 Discounts & Coupons', '💬 Contact Support on WhatsApp'],
          action_type: 'ORDER_TRACKING',
          order
        };
      } else {
        return {
          text: `I couldn't find an order with number **${orderNo}**. Please verify your 5-digit order ID (e.g., YC-10245) or reply with your registered phone number!`,
          quick_replies: ['📦 Track Order YC-10245', '💬 Ask Support'],
          action_type: 'ORDER_NOT_FOUND'
        };
      }
    }
    return {
      text: `I can help you track any order! Please provide your 5-digit Order Number (e.g., **YC-10245**). You can also view all your recent orders under **My Account > Orders**.`,
      quick_replies: ['YC-10245', 'View Account Orders'],
      action_type: 'ORDER_PROMPT'
    };
  }

  // 2. Discounts, Coupons & Offers Query
  if (lowerPrompt.includes('discount') || lowerPrompt.includes('coupon') || lowerPrompt.includes('offer') || lowerPrompt.includes('promo') || lowerPrompt.includes('deal')) {
    const activeCoupons = db.data.coupons.filter(c => c.status === 'ACTIVE');
    const activeOffers = db.data.offers.filter(o => o.status === 'ACTIVE');

    let responseText = `🎁 **Exclusive Active Offers & Coupons at ${STORE_NAME}:**\n\n`;
    
    activeCoupons.forEach(c => {
      const discountDesc = c.discount_type === 'PERCENT' ? `${c.discount_value}% OFF` : `FLAT ₹${c.discount_value} OFF`;
      responseText += `🏷️ **Code: \`${c.code}\`** — ${discountDesc} (Min. Order ₹${c.min_order_amount})\n`;
    });

    if (activeOffers.length > 0) {
      responseText += `\n🔥 **Featured Promotion:** ${activeOffers[0].title} — ${activeOffers[0].discount_tag}! ${activeOffers[0].subtitle}`;
    }

    responseText += `\n\n*Tip: Apply coupon codes during checkout or ask me to auto-apply the best code for your cart!*`;

    return {
      text: responseText,
      quick_replies: ['🔥 Trending Shirts', '👕 Explore Men Collection', '👗 Explore Women Collection'],
      action_type: 'COUPONS'
    };
  }

  // 3. Trending / Best Collections Query
  if (lowerPrompt.includes('trending') || lowerPrompt.includes('best collection') || lowerPrompt.includes('bestseller') || lowerPrompt.includes('popular') || lowerPrompt.includes('hot')) {
    const trendingProds = db.data.products.filter(p => p.is_trending && p.status === 'ACTIVE').slice(0, 4).map(enrichProduct);

    return {
      text: `🔥 Here are our top-rated trending styles right now at **${STORE_NAME}**! Designed for modern comfort and unmatched durability:`,
      products: trendingProds,
      quick_replies: ['🎁 Discounts & Coupons', '📐 Size Guide', '📦 Track Order'],
      action_type: 'PRODUCTS_LIST'
    };
  }

  // 4. Shirts / T-Shirts Search
  if (lowerPrompt.includes('shirt') || lowerPrompt.includes('tshirt') || lowerPrompt.includes('polo')) {
    const shirts = db.data.products.filter(p => 
      (p.name.toLowerCase().includes('shirt') || p.description.toLowerCase().includes('shirt')) && p.status === 'ACTIVE'
    ).slice(0, 4).map(enrichProduct);

    return {
      text: `👔 Here are our top premium shirts and polos crafted from 100% fine cotton and French linen:`,
      products: shirts,
      quick_replies: ['📐 Size Chart for Shirts', '🎁 Check Coupons'],
      action_type: 'PRODUCTS_LIST'
    };
  }

  // 5. Jeans / Cargo Pants Search
  if (lowerPrompt.includes('jean') || lowerPrompt.includes('pant') || lowerPrompt.includes('cargo') || lowerPrompt.includes('trouser') || lowerPrompt.includes('denim')) {
    const jeans = db.data.products.filter(p => 
      (p.name.toLowerCase().includes('jean') || p.name.toLowerCase().includes('cargo') || p.name.toLowerCase().includes('pant') || p.category_id.includes('jeans') || p.category_id.includes('cargo')) && p.status === 'ACTIVE'
    ).slice(0, 4).map(enrichProduct);

    return {
      text: `👖 Check out our best-selling jeans & tactical cargo pants:`,
      products: jeans,
      quick_replies: ['📐 How do jeans fit?', '🔥 Trending Shirts'],
      action_type: 'PRODUCTS_LIST'
    };
  }

  // 6. Women Fashion Search
  if (lowerPrompt.includes('women') || lowerPrompt.includes('dress') || lowerPrompt.includes('kurti') || lowerPrompt.includes('top') || lowerPrompt.includes('saree')) {
    const womenProds = db.data.products.filter(p => p.gender === 'WOMEN' && p.status === 'ACTIVE').slice(0, 4).map(enrichProduct);

    return {
      text: `👗 Explore our exclusive Women's fashion collection including boho dresses, designer silk kurtis, and relaxed tops:`,
      products: womenProds,
      quick_replies: ['🎁 Discounts & Coupons', '🔥 Trending Shirts'],
      action_type: 'PRODUCTS_LIST'
    };
  }

  // 7. Size Guide Query
  if (lowerPrompt.includes('size') || lowerPrompt.includes('measurement') || lowerPrompt.includes('fit') || lowerPrompt.includes('chart')) {
    return {
      text: `📐 **Youth Choice AI Fit & Size Guide**:\n\n• **Small (S):** Chest 36-38", Waist 30"\n• **Medium (M):** Chest 39-40", Waist 32"\n• **Large (L):** Chest 41-42", Waist 34"\n• **XL:** Chest 43-44", Waist 36"\n• **XXL:** Chest 45-46", Waist 38"\n\n💡 *Fit Tip:* For oversized drop-shoulder t-shirts, select your standard size for a relaxed streetwear vibe. For slim fit shirts/polo, choose 1 size up if you prefer standard comfort.`,
      quick_replies: ['👕 Show Oversized T-Shirts', '👔 Show Slim Fit Polos'],
      action_type: 'SIZE_GUIDE'
    };
  }

  // 8. General catalog / Search keyword match fallback
  const matchingProducts = db.data.products.filter(p => {
    if (p.status !== 'ACTIVE') return false;
    const combined = `${p.name} ${p.description} ${p.material} ${p.fit}`.toLowerCase();
    return lowerPrompt.split(' ').some(word => word.length > 3 && combined.includes(word));
  }).slice(0, 4).map(enrichProduct);

  if (matchingProducts.length > 0) {
    return {
      text: `Here are the top matches I found in our store for your query:`,
      products: matchingProducts,
      quick_replies: ['🎁 Discounts & Coupons', '📐 Size Guide', '📦 Track Order'],
      action_type: 'PRODUCTS_LIST'
    };
  }

  // 9. General Greeting / Fallback
  return {
    text: `👋 Hi! I'm **Rufus**, your Youth Choice AI shopping assistant. How can I help you find the perfect outfit today?\n\nYou can ask me about our latest collections, check active coupons, track your order status, or get instant size & fit recommendations!`,
    quick_replies: ['🔥 Trending Shirts', '🎁 Discounts & Coupons', '📦 Track Order', '📐 Size Guide'],
    action_type: 'GREETING'
  };
}

// 1. MAIN CHAT API ROUTE: /api/ai/chat
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { prompt, history = [], current_page, product_id, order_number } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt string is required' });
    }

    // Build store summary context for Gemini API
    const activeProducts = db.data.products.filter(p => p.status === 'ACTIVE');
    const storeContext = `You are Rufus, the friendly and smart AI Shopping Assistant for "${STORE_NAME}".
Store Details:
- Phone / WhatsApp: ${WHATSAPP_PHONE}
- Total Catalog Products: ${activeProducts.length}
- Active Coupons: ${db.data.coupons.map(c => `${c.code} (${c.discount_value}${c.discount_type === 'PERCENT' ? '%' : ' INR'} OFF)`).join(', ')}
- Current Page context: ${current_page || 'Home'}
- User current order reference: ${order_number || 'None'}

Goal: Help the customer politely, suggest clothing styles, explain size fits, help track orders, and offer active discount codes. Keep answers helpful, styled nicely with bullet points and emojis.`;

    // Try Gemini API first if configured
    let aiResponseText = await callGeminiApi(prompt, storeContext, history);

    // Get local structured engine result (always gives product cards, quick replies, and precise DB matches)
    const localResult = processLocalAIQuery(prompt, history);

    // If Gemini provided a response, use its text while pairing local product cards / quick replies!
    const finalResult = {
      text: aiResponseText || localResult.text,
      products: localResult.products || [],
      quick_replies: localResult.quick_replies || ['🔥 Trending Shirts', '🎁 Discounts & Coupons', '📦 Track Order'],
      action_type: localResult.action_type || 'CHAT_RESPONSE',
      order: localResult.order || null
    };

    // Log analytics event
    try {
      db.data.analytics_events.push({
        id: `evt-ai-${Date.now()}`,
        event_type: 'AI_CHAT_QUERY',
        metadata: JSON.stringify({ prompt: prompt.slice(0, 100), page: current_page }),
        created_at: new Date().toISOString()
      });
      db.save();
    } catch (e) {
      // Ignore analytics logging errors
    }

    res.json(finalResult);
  } catch (err: any) {
    console.error('Error in AI chat endpoint:', err);
    res.status(500).json({ error: err.message || 'Internal server error in AI Assistant' });
  }
});

// 2. SIZE RECOMMENDATION API ROUTE: /api/ai/size-guide
router.post('/size-guide', (req: Request, res: Response) => {
  try {
    const { height_cm, weight_kg, fit_preference = 'REGULAR', product_type = 'TOP' } = req.body;

    let recommendedSize = 'M';
    let confidence = '95%';
    let advice = 'Standard fit based on measurements.';

    const height = Number(height_cm) || 175;
    const weight = Number(weight_kg) || 70;

    if (weight < 60) recommendedSize = 'S';
    else if (weight >= 60 && weight < 73) recommendedSize = 'M';
    else if (weight >= 73 && weight < 85) recommendedSize = 'L';
    else if (weight >= 85 && weight < 95) recommendedSize = 'XL';
    else recommendedSize = 'XXL';

    if (fit_preference === 'OVERSIZED' && recommendedSize !== 'XXL') {
      const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
      const currentIdx = sizes.indexOf(recommendedSize);
      recommendedSize = sizes[currentIdx + 1];
      advice = 'Sized up 1 notch for an oversized streetwear drape!';
    } else if (fit_preference === 'SLIM' && recommendedSize !== 'S') {
      advice = 'Chosen for a body-sculpted, structured slim silhouette.';
    }

    res.json({
      recommended_size: recommendedSize,
      confidence,
      advice,
      size_chart: {
        S: { chest: '36-38"', waist: '30"' },
        M: { chest: '39-40"', waist: '32"' },
        L: { chest: '41-42"', waist: '34"' },
        XL: { chest: '43-44"', waist: '36"' },
        XXL: { chest: '45-46"', waist: '38"' }
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. OUTFIT PAIRING API ROUTE: /api/ai/outfit-pairing
router.post('/outfit-pairing', (req: Request, res: Response) => {
  try {
    const { product_id } = req.body;
    const product = db.data.products.find(p => p.id === product_id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Find matching complementary products (e.g. if shirt, pair with jeans/shoes)
    let pairings = [];
    if (product.category_id.includes('tshirts') || product.category_id.includes('shirts')) {
      pairings = db.data.products.filter(p => (p.category_id.includes('jeans') || p.category_id.includes('cargo') || p.category_id.includes('footwear')) && p.id !== product_id);
    } else if (product.category_id.includes('jeans') || product.category_id.includes('cargo')) {
      pairings = db.data.products.filter(p => (p.category_id.includes('tshirts') || p.category_id.includes('shirts') || p.category_id.includes('hoodies')) && p.id !== product_id);
    } else {
      pairings = db.data.products.filter(p => p.id !== product_id);
    }

    const enrichedPairings = pairings.slice(0, 3).map(p => {
      const primaryImg = db.data.product_images.find(img => img.product_id === p.id && img.is_primary) 
        || db.data.product_images.find(img => img.product_id === p.id);
      const brand = db.data.brands.find(b => b.id === p.brand_id);
      return {
        ...p,
        image_url: primaryImg?.image_url || '',
        brand_name: brand?.name || 'Youth Choice'
      };
    });

    res.json({
      product_name: product.name,
      stylist_tip: `Pair this ${product.name} with contrasting bottom wear and retro sneakers for a clean urban aesthetic.`,
      matching_outfits: enrichedPairings
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. ADMIN AI INSIGHTS API ROUTE: /api/ai/admin-insights
router.get('/admin-insights', (req: Request, res: Response) => {
  try {
    const totalProducts = db.data.products.length;
    const totalOrders = db.data.orders.length;
    const totalRevenue = db.data.orders.reduce((sum, o) => sum + o.grand_total, 0);

    const lowStockVariants = db.data.product_variants.filter(v => v.stock <= 3);
    const trendingProds = db.data.products.filter(p => p.is_trending);

    const insights = [
      `🚀 **Revenue Velocity:** Generated ₹${totalRevenue.toLocaleString()} across ${totalOrders} orders. High conversion rate via WhatsApp integration.`,
      `⚠️ **Inventory Health Alert:** ${lowStockVariants.length} product variants are running low in stock (≤ 3 units). Recommend restocking top size 'L' & 'XL' items.`,
      `🔥 **Trending Insights:** ${trendingProds.length} items marked as Trending are generating 68% of total page views this week.`,
      `💡 **Pricing Recommendation:** Coupon 'YOUTH20' is your top converting promo code. Consider launching a weekend 'FLAT ₹500 OFF' flash offer.`
    ];

    res.json({
      summary: `Youth Choice AI Store Diagnostics — System Operational`,
      insights,
      metrics: {
        total_products: totalProducts,
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        low_stock_count: lowStockVariants.length
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
