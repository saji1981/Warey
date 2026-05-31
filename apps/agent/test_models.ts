const testModels = async () => {
  const apiKey = 'AIzaSyDk8x6ZKfkiT0a8SauLCORv9SNetWGSa8k';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    console.log(JSON.stringify(data.models.map((m: any) => m.name), null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
};
testModels();
