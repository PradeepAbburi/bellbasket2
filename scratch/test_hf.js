async function test() {
  const url = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: '<s>[INST] Who is the President of the USA? [/INST]'
      })
    });
    
    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Data:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
