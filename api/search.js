export default async function handler(req, res) {
  // CORS Preflight headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query.q || '';
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }

  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch search results from source' });
    }

    const html = await response.text();
    const results = [];
    const itemRegex = /<a rel="nofollow" class="result__a"[^>]*href="([^"]*)">([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    
    let match;
    while ((match = itemRegex.exec(html)) !== null && results.length < 5) {
      let rawUrl = match[1];
      let title = match[2].replace(/<[^>]*>/g, '').trim();
      let snippet = match[3].replace(/<[^>]*>/g, '').trim();
      
      // Clean up URL if it starts with //duckduckgo.com/l/?uddg=
      let finalUrl = rawUrl;
      if (rawUrl.includes('uddg=')) {
        try {
          const urlParams = new URLSearchParams(rawUrl.split('?')[1]);
          finalUrl = urlParams.get('uddg') || rawUrl;
        } catch (e) {
          // Fallback
        }
      }
      
      title = decodeHtmlEntities(title);
      snippet = decodeHtmlEntities(snippet);
      
      results.push({ title, snippet, url: finalUrl });
    }
    
    // Add CORS headers so we can access this endpoint from the client side if needed
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.status(200).json({ results });
  } catch (err) {
    console.error("Search API Error:", err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}
