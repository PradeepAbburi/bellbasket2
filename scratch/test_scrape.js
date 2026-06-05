async function test() {
  const query = 'premier league standings';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    
    const results = [];
    // We can search for <div class="result results_links results_links_deep web-result"> or just find result__a
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
      
      // Decode HTML entities in title/snippet (e.g. &amp;, &quot;)
      title = decodeHtmlEntities(title);
      snippet = decodeHtmlEntities(snippet);
      
      results.push({ title, snippet, url: finalUrl });
    }
    
    console.log("Scraped results:\n", JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("Error:", err);
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

test();
