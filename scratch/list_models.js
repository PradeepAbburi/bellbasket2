import fetch from 'node-fetch';

const key = "AQ.Ab8RN6I_Kc1a8QEmYsgB6RLeDJkA3pYX8viYrAE4sTijsj2MhA";

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  console.log(`Listing models for key...`);
  try {
    const res = await fetch(url);
    const data = await res.json();
    const geminiModels = (data.models || []).filter(m => m.name.toLowerCase().includes('gemini'));
    console.log(`Available Gemini Models:`);
    geminiModels.forEach(m => console.log(`- ${m.name} (${m.displayName})`));
  } catch (e) {
    console.error(e);
  }
}

listModels();
