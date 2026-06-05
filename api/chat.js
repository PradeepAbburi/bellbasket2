import dotenv from 'dotenv';
dotenv.config();

export default async function handler(req, res) {
  // CORS Preflight headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Support POST request for the chat prompt and system instructions
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { prompt, systemPrompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request body' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    try {
      // Call the official Google Gemini 1.5 Flash API
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt || 'You are Ask, the local conversational assistant built for BellBasket.' }]
          },
          generationConfig: {
            maxOutputTokens: 1200,
            temperature: 0.75
          }
        })
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('Gemini API Error details:', errorText);
        throw new Error(`Gemini API returned status ${geminiResponse.status}`);
      }

      const data = await geminiResponse.json();
      const botText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (botText) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json({ text: botText.trim() });
      }
      
      throw new Error('Invalid response structure from Gemini API');
    } catch (err) {
      console.error('Gemini API Call failed, falling back to local engine:', err);
      // Fallback is handled below
    }
  }

  // ═══════════════════════════════════════════════════════
  // INTELLIGENT FALLBACK ENGINE (No API Key Required)
  // ═══════════════════════════════════════════════════════
  try {
    let responseText = '';
    const lowerPrompt = prompt.toLowerCase();
    
    // Check for live web search results in system prompt
    const hasSearchResults = systemPrompt && systemPrompt.includes('[LIVE SEARCH SCRAIPED RESULTS');
    const hasStoreMatches = systemPrompt && systemPrompt.includes('matching stores near the user');
    const hasProductMatches = systemPrompt && systemPrompt.includes('relevant products matching');

    // ─── WEB SEARCH RESULTS ───
    if (hasSearchResults) {
      const queryMatch = systemPrompt.match(/LIVE SEARCH SCRAIPED RESULTS FROM GOOGLE\/WEB FOR "([^"]*)"/);
      const query = queryMatch ? queryMatch[1] : 'your query';
      
      responseText = `Here's what I found on the web for "${query}" 🔍\n\n`;
      
      const resultBlocks = systemPrompt.match(/Result #\d+:[\s\S]*?(?=Result #\d+:|Instructions for using live|$)/g);
      
      if (resultBlocks && resultBlocks.length > 0) {
        resultBlocks.forEach((block) => {
          const titleMatch = block.match(/Title: ([^\n]*)/);
          const urlMatch = block.match(/Source URL: ([^\n]*)/);
          const snippetMatch = block.match(/Snippet: ([\s\S]*?)(?=\nTitle:|\nSource URL:|\nSnippet:|$)/);
          
          if (titleMatch) {
            const title = titleMatch[1].trim();
            const url = urlMatch ? urlMatch[1].trim() : '#';
            const snippet = snippetMatch ? snippetMatch[1].replace(/Result #\d+:|Title:|Source URL:|Snippet:/g, '').trim() : '';
            
            responseText += `⭐ **${title}**\n${snippet}\n🔗 ${url}\n\n`;
          }
        });
        
        responseText += `Hope this helps! Let me know if you'd like to search for anything else. 😊`;
      } else {
        responseText += `I found some results but couldn't extract details. Try rephrasing your query for better results!`;
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ text: responseText });
    }

    // ─── STORE/PRODUCT CONTEXT-AWARE RESPONSES ───
    if (hasStoreMatches && hasProductMatches) {
      responseText = `Great news! I found stores and products matching your search right here on BellBasket! 🎉\n\nCheck out the store and product cards below — you can visit the store pages or add items directly to your cart. Tap on any card to explore more!`;
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ text: responseText });
    }

    if (hasStoreMatches) {
      responseText = `I found some great matches near you! 📍\n\nI've listed the best options below based on your search. Each card shows ratings, distance, and recent reviews. Tap any store to explore their full catalog or book a service!`;
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ text: responseText });
    }

    if (hasProductMatches) {
      responseText = `I found products matching your search! 🛒\n\nCheck out the product cards below — you can see prices, store names, and add items directly to your cart with one tap!`;
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ text: responseText });
    }

    // ─── CONVERSATIONAL INTELLIGENCE ───
    // Extract the last customer message from the prompt
    const lines = prompt.split('\n');
    const lastLine = lines[lines.length - 1] || '';
    const customerMsg = lastLine.replace(/^Customer:\s*/i, '').trim().toLowerCase();

    // --- Greetings ---
    if (/^(hi|hello|hey|hii+|heyy*|yo|namaste|namaskar|howdy|sup|good\s*(morning|afternoon|evening|night))/.test(customerMsg)) {
      const greetings = [
        `Hello! 👋 Welcome to BellBasket! I'm Ask, your personal neighborhood assistant. I can help you find the best restaurants, grocery stores, salons, repair services, and much more near you. What are you looking for today?`,
        `Hey there! 😊 I'm Ask — your BellBasket guide. Need to find a great restaurant, a nearby grocery store, or book a home service? Just tell me what you need!`,
        `Namaste! 🙏 I'm Ask, here to help you discover amazing local shops and services. Try asking me things like "best restaurant near me" or "AC repair service"!`
      ];
      responseText = greetings[Math.floor(Math.random() * greetings.length)];
    }
    // --- Thanks / Appreciation ---
    else if (/^(thanks?|thank\s*you|thx|thanku|ty|awesome|great|perfect|wonderful|amazing|cool|nice|superb|fabulous|excellent|good\s*job|well\s*done)/.test(customerMsg)) {
      const thanks = [
        `You're welcome! 😊 Happy to help! Is there anything else you'd like me to find for you?`,
        `Glad I could help! 🌟 Don't hesitate to ask me anything — I'm always here for you!`,
        `My pleasure! 💛 If you need more recommendations, just type away!`
      ];
      responseText = thanks[Math.floor(Math.random() * thanks.length)];
    }
    // --- How are you / Personal ---
    else if (/how\s*are\s*you|how\s*r\s*u|how('s| is)\s*it\s*going|what('s| is)\s*up|hru/.test(customerMsg)) {
      responseText = `I'm doing great, thanks for asking! 😄 I'm always energized when I get to help people find the best local shops and services. What can I help you with today?`;
    }
    // --- Who are you / Identity ---
    else if (/who\s*are\s*you|what\s*are\s*you|your\s*name|about\s*you|tell\s*me\s*about\s*(yourself|you)/.test(customerMsg)) {
      responseText = `I'm **Ask** — BellBasket's smart neighborhood assistant! 🤖✨\n\nHere's what I can do:\n• 🍔 Find restaurants, cafes & food joints near you\n• 🍎 Locate grocery stores & kirana shops\n• 💇‍♀️ Discover salons, spas & beauty parlors\n• 🛠️ Book AC repair, plumbing, electrical services\n• 💊 Find pharmacies & medical stores\n• 👗 Browse clothing & accessory shops\n• 🔍 Search the web for general questions\n\nJust type what you need and I'll find it for you!`;
    }
    // --- Help / Capabilities ---
    else if (/help|what\s*can\s*you\s*do|features|options|menu|commands|capability/.test(customerMsg)) {
      responseText = `Here's everything I can help you with! 🚀\n\n🔍 **Find Local Stores**\n• "Best restaurant near me"\n• "Grocery shops nearby"\n• "Kirana store"\n\n💇 **Book Services**\n• "AC repair service"\n• "Plumber near me"\n• "Salon and spa"\n• "Laptop repair"\n\n🛒 **Find Products**\n• "Biryani ingredients"\n• "Rice and spices"\n• "Paneer"\n\n🌐 **General Questions**\n• "What is the capital of France?"\n• "How to make biryani?"\n• "Weather today"\n\n🧹 Type **"clear"** to reset the conversation anytime!`;
    }
    // --- Recipe / Cooking ---
    else if (/recipe|how\s*to\s*(make|cook|prepare|bake)|ingredients?\s*for|cooking\s*tips?/.test(customerMsg)) {
      if (/biryani/.test(customerMsg)) {
        responseText = `Here's a quick Biryani recipe! 🍚🍗\n\n**Ingredients:**\n• 2 cups Basmati Rice\n• 500g Chicken/Mutton\n• 2 Onions (thinly sliced)\n• 2 Tomatoes\n• 1 cup Curd/Yogurt\n• Biryani Masala, Turmeric, Red Chili\n• Ginger-Garlic Paste\n• Ghee, Oil, Mint, Coriander\n• Saffron soaked in warm milk\n\n**Steps:**\n1. Marinate meat with curd, spices & ginger-garlic paste for 1 hour\n2. Fry onions golden, add tomatoes & cook the meat\n3. Layer half-cooked rice over the meat\n4. Add saffron milk, mint & ghee on top\n5. Seal & cook on low flame (dum) for 25 mins\n\n🛒 You can find all these ingredients on BellBasket! Try searching "rice", "masala", or "chicken" to see what's available near you.`;
      } else if (/cake|bake/.test(customerMsg)) {
        responseText = `Here's a simple Cake recipe! 🎂\n\n**Ingredients:**\n• 1.5 cups All-Purpose Flour (Maida)\n• 1 cup Sugar\n• 3 Eggs\n• 1/2 cup Butter/Oil\n• 1 cup Milk\n• 1 tsp Baking Powder\n• 1 tsp Vanilla Extract\n• Pinch of Salt\n\n**Steps:**\n1. Preheat oven to 180°C\n2. Mix dry ingredients (flour, baking powder, salt)\n3. Cream butter & sugar, add eggs one by one\n4. Alternately add dry mix & milk\n5. Pour in greased pan, bake 30-35 mins\n\n🛒 Search for "flour", "sugar", or "butter" on BellBasket to get ingredients delivered!`;
      } else if (/chai|tea/.test(customerMsg)) {
        responseText = `Perfect Indian Chai recipe! ☕\n\n**Ingredients:**\n• 1 cup Water + 1 cup Milk\n• 2 tsp Tea leaves (Assam or CTC)\n• 2 tsp Sugar (adjust to taste)\n• 2 Cardamom pods (crushed)\n• Small piece of Ginger (crushed)\n\n**Steps:**\n1. Boil water with ginger & cardamom\n2. Add tea leaves, simmer 2 mins\n3. Add milk & sugar, bring to boil\n4. Strain & serve hot!\n\n🛒 Find tea, sugar, and spices at nearby grocery stores on BellBasket!`;
      } else {
        responseText = `I'd love to help with that recipe! 🍳\n\nWhile I specialize in finding local stores and products, I can definitely help you get the ingredients! Tell me what dish you're planning and I'll:\n\n1. 📝 Share a quick recipe\n2. 🛒 Find the ingredients at stores near you\n3. 📍 Show you the closest grocery shops\n\nTry asking: "biryani recipe", "cake recipe", or "chai recipe"!`;
      }
    }
    // --- Price / Cost ---
    else if (/price|cost|how\s*much|rate|charges?|fees?|budget|cheap|affordable|expensive/.test(customerMsg)) {
      responseText = `Great question about pricing! 💰\n\nOn BellBasket, prices are set directly by local store owners and vary by store. Here's how to find the best deals:\n\n• 🏷️ Search for specific products to compare prices across stores\n• ⭐ Check store ratings and reviews for quality assurance\n• 📍 Nearby stores often have competitive pricing\n• 🎯 Look for stores with deals and combos\n\nTry searching for the specific product you want (e.g., "rice", "oil", "paneer") and I'll show you what's available with prices!`;
    }
    // --- Delivery ---
    else if (/delivery|deliver|shipping|ship|dispatch|home\s*delivery|door\s*step|order\s*online/.test(customerMsg)) {
      responseText = `Here's how delivery works on BellBasket! 🚚\n\n• 📍 Stores within **15km** of your location are shown\n• 🏪 Each store sets their own delivery options\n• 💰 Some stores offer free delivery, others may charge a small fee\n• 🛍️ You can also choose **Pickup** to collect your order directly\n\nTo get started, search for what you need and add items to your cart. The store will confirm your order and delivery details!`;
    }
    // --- Compare / Which is better ---
    else if (/compare|which\s*(is|one|one's)\s*better|vs|versus|difference\s*between|recommend/.test(customerMsg)) {
      responseText = `I'd recommend checking out the stores near you and comparing them based on:\n\n⭐ **Ratings** — Higher rated stores generally offer better quality\n📍 **Distance** — Closer stores mean faster delivery\n💬 **Reviews** — Read what other customers say\n💰 **Prices** — Compare product prices across stores\n\nTry searching for the specific category (e.g., "restaurant", "grocery") and I'll show you the top options with ratings and reviews so you can pick the best one!`;
    }
    // --- Weather ---
    else if (/weather|temperature|rain|sunny|forecast|climate|hot|cold\s*outside/.test(customerMsg)) {
      responseText = `I don't have direct access to live weather data, but I searched the web for you! 🌤️\n\nFor the most accurate weather update, you can:\n• Check your phone's weather app\n• Visit weather.com or Google "weather [your city]"\n\nMeanwhile, if it's a hot day ☀️, search for "cold drinks" or "ice cream" on BellBasket! If it's rainy 🌧️, order groceries for a cozy home-cooked meal!`;
    }
    // --- Time ---
    else if (/what\s*time|current\s*time|time\s*now|what('s| is)\s*the\s*time/.test(customerMsg)) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
      responseText = `The current time is **${timeStr}** (IST) 🕐\n\nIs there anything I can help you find on BellBasket?`;
    }
    // --- Jokes ---
    else if (/joke|funny|make\s*me\s*laugh|humor/.test(customerMsg)) {
      const jokes = [
        `Why did the grocery store employee go to therapy? 😄\nBecause they had too many *checkout* issues! 🛒\n\nSpeaking of checkout — ready to find some great stores near you? 😉`,
        `What did the biryani say to the rice? 🍚\n"You're nothing without me!" 😂\n\nCraving biryani? Search for biryani ingredients on BellBasket!`,
        `Why don't AC repairmen ever get lost? 🛠️\nBecause they always know the *cool* routes! ❄️😄\n\nNeed AC repair? Just ask me "AC repair near me"!`
      ];
      responseText = jokes[Math.floor(Math.random() * jokes.length)];
    }
    // --- Festival / Occasion ---
    else if (/festival|diwali|holi|eid|christmas|new\s*year|birthday|wedding|anniversary|gift|celebration|party|puja|navratri|ganesh|onam|pongal|sankranti|rakhi|valentine/.test(customerMsg)) {
      responseText = `Celebrations call for the best shopping! 🎉🎊\n\nHere's how BellBasket can help with your occasion:\n\n• 🎁 **Gifts** — Browse clothing & accessory shops\n• 🍰 **Sweets & Cakes** — Find bakeries & sweet shops\n• 🍳 **Ingredients** — Get fresh groceries for special recipes\n• 💐 **Decorations** — Check local general stores\n• 💇‍♀️ **Grooming** — Book salon & spa appointments\n\nTry searching for "bakery", "grocery", or "salon" to get started!`;
    }
    // --- Health / Medical ---
    else if (/health|medicine|medical|pharmacy|doctor|fever|cold|cough|headache|pain|hospital|clinic|wellness|ayurveda|sick|unwell/.test(customerMsg)) {
      responseText = `I hope you feel better soon! 💊🙏\n\nHere's how BellBasket can help:\n\n• 💊 Search **"pharmacy"** to find medical stores near you\n• 🏥 Look up **"medical"** or **"doctor"** for clinics\n• 🌿 Try **"ayurveda"** for wellness products\n\n⚠️ *For medical emergencies, please call 108 (Ambulance) or visit the nearest hospital immediately.*\n\nFor medicines and health products, search "pharmacy near me" and I'll show you the closest options!`;
    }
    // --- Open/Close / Timing ---
    else if (/open|close|timing|hours|available|when\s*(does|do|is)|working\s*hours|operational/.test(customerMsg)) {
      responseText = `Store timings on BellBasket vary by store! 🕐\n\nEach store sets their own operating hours. Here's how to check:\n\n1. 🔍 Search for the store or category\n2. 📍 Tap on the store card to visit their page\n3. ⏰ You'll see their open/close timings on the store detail page\n\nStores that are currently **closed** will be marked accordingly. Only open stores show active products!`;
    }
    // --- Payment ---
    else if (/payment|pay|upi|cash|online\s*payment|cod|card\s*payment|wallet|gpay|phonepe|paytm/.test(customerMsg)) {
      responseText = `BellBasket supports flexible payment options! 💳\n\n• 💵 **Cash on Delivery/Pickup** — Pay when you receive your order\n• 📱 **Online Payment** — Pay securely through our platform\n• 🏪 **Store Pickup** — Order online, pick up and pay at the store\n\nPayment methods may vary by store. You'll see available options at checkout!`;
    }
    // --- Order status / Track ---
    else if (/order\s*status|track|tracking|where\s*is\s*my\s*order|my\s*order|delivery\s*status|order\s*update/.test(customerMsg)) {
      responseText = `You can track your orders easily! 📦\n\n1. Go to your **Profile** page\n2. Tap on **My Orders** or check **Receipts**\n3. You'll see the real-time status of each order\n\nOrder statuses:\n• 🟡 **Pending** — Waiting for store confirmation\n• 🟢 **Accepted** — Store is preparing your order\n• 📦 **Packed** — Ready for pickup/dispatch\n• 🚚 **Out for Delivery** — On its way!\n• ✅ **Completed** — Delivered successfully\n\nNeed anything else?`;
    }
    // --- Refund / Cancel ---
    else if (/refund|cancel|return|exchange|complaint|issue|problem|wrong\s*order|damaged/.test(customerMsg)) {
      responseText = `I understand your concern! 😔\n\nFor order issues, here's what you can do:\n\n1. 📞 **Contact the Store** — Tap the store's phone number on the order page\n2. 💬 **Support Chat** — Go to Help & Support for direct assistance\n3. 📧 **Report Issue** — File a complaint through the support section\n\nStore owners handle refunds and exchanges directly. For urgent issues, reaching out via the store's contact number is the fastest way!\n\nIs there anything else I can help with?`;
    }
    // --- Discount / Offers ---
    else if (/discount|offer|deal|coupon|sale|promo|promotional|cashback|save\s*money|bargain/.test(customerMsg)) {
      responseText = `Looking for deals? Great choice! 🏷️✨\n\n• 🔥 Check the **Deals** section for live flash deals and combos\n• 💰 Some stores offer special discounted prices\n• 🎫 Use **coupon codes** at checkout if you have any\n• 📍 Compare prices across stores for the best value\n\nI'll show deals and discounted products when you search for specific items. Try searching for what you need!`;
    }
    // --- Bye / Goodbye ---
    else if (/^(bye|goodbye|good\s*bye|see\s*you|take\s*care|cya|later|tata|bye\s*bye)/.test(customerMsg)) {
      responseText = `Goodbye! 👋 It was great chatting with you! Come back anytime you need help finding stores, products, or services. Take care! 😊💛`;
    }
    // --- Yes / Confirmation ---
    else if (/^(yes|yeah|yep|yup|sure|okay|ok|alright|affirmative|definitely|of\s*course)$/.test(customerMsg)) {
      responseText = `Great! 😊 What would you like me to help you find? You can ask me about:\n\n• 🍔 Restaurants & food\n• 🍎 Grocery stores\n• 💇 Salons & spas\n• 🛠️ Home services (AC, plumber, etc.)\n• 🛒 Specific products\n\nOr ask me anything general — I'll search the web for you!`;
    }
    // --- No ---
    else if (/^(no|nah|nope|not?\s*really|nothing|no\s*thanks?)$/.test(customerMsg)) {
      responseText = `No worries at all! 😊 Whenever you need help finding stores, products, or services, just type away. I'm always here! 💛`;
    }
    // --- Bellbasket specific ---
    else if (/bellbasket|bell\s*basket|about\s*this\s*app|about\s*app/.test(customerMsg)) {
      responseText = `**BellBasket** is your hyperlocal marketplace! 🛎️🧺\n\n🏪 **For Customers:**\n• Discover stores, restaurants & services near you\n• Order products & get them delivered\n• Book home services (AC repair, plumber, etc.)\n• Read reviews & compare options\n\n🏬 **For Vendors:**\n• List your store & products\n• Manage orders & bookings\n• Track analytics & reviews\n• Grow your local business\n\nWe connect local businesses with local customers — making neighborhoods smarter! 🚀`;
    }
    // --- Location ---
    else if (/location|address|where\s*am\s*i|my\s*location|change\s*location|update\s*location|area|city|near\s*me/.test(customerMsg)) {
      responseText = `Your location helps me find the best stores near you! 📍\n\nTo update your location:\n1. Go to your **Profile** page\n2. Tap on **Location/Address** settings\n3. Allow location access or enter your address manually\n\nI currently show stores within **15km** of your saved location. If results seem off, updating your location should fix things!\n\nOnce set, try asking "restaurants near me" or "grocery shops nearby" for accurate results!`;
    }
    // --- Default intelligent response ---
    else {
      // Try to provide a relevant response based on keywords
      const query = customerMsg.replace(/[?!.,]/g, '').trim();
      
      if (query.length < 3) {
        responseText = `I didn't quite catch that! 😅 Could you type a bit more? For example:\n\n• "Best restaurant near me"\n• "Grocery shops nearby"\n• "AC repair service"\n• "How to make biryani?"\n\nI'm here to help! 💛`;
      } else {
        responseText = `I understand you're looking for "${query}"! 🔍\n\nI've searched our local database for matching stores and products. If you see cards below, tap on them to explore!\n\nIf there are no matches, try:\n• Using different keywords (e.g., "grocery" instead of specific product names)\n• Searching for broader categories like "food", "repair", or "salon"\n• Asking me a general question — I can search the web too!\n\nWhat else can I help with? 😊`;
      }
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ text: responseText });
  } catch (err) {
    console.error('Local fallback engine failed:', err);
    return res.status(500).json({ error: 'Failed to generate response' });
  }
}
