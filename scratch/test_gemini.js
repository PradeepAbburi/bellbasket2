import fetch from 'node-fetch';

const key = "AQ.Ab8RN6I_Kc1a8QEmYsgB6RLeDJkA3pYX8viYrAE4sTijsj2MhA";

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
  console.log(`Testing gemini-2.0-flash...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hello! Please reply with exactly: Yes, it works!' }] }]
      })
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log(`Response:`, data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (e) {
    console.error(e);
  }
}

test();
