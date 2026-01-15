const API_URL = "https://yummy-321287803064.asia-south1.run.app";
const RESTAURANT_ID = 52;

async function checkMenu() {
  const url = `${API_URL}/menus/restaurant/${RESTAURANT_ID}/grouped`;
  console.log(`Fetching: ${url}`);
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`Error: ${res.status}`);
      return;
    }
    
    // Check Content-Type to avoid parse errors
    const type = res.headers.get("content-type");
    if (!type || !type.includes("application/json")) {
        console.log(`Invalid content type: ${type}`);
        const text = await res.text();
        console.log("Response sample:", text.substring(0, 200));
        return;
    }

    const json = await res.json();
    const data = json.data || json;
    
    console.log(`Found ${data.length} categories.`);
    
    data.forEach(cat => {
      console.log(`\nCategory: [${cat.id}] ${cat.name}`);
      console.log(`  Description: ${cat.description || "N/A"}`);
      console.log(`  Items: ${cat.items ? cat.items.length : 0}`);
      
      if (cat.items && cat.items.length > 0) {
        // Show first item as sample
        const item = cat.items[0];
        console.log(`  Sample Item: [${item.id}] ${item.name} (${item.price})`);
      }
    });

  } catch (e) {
    console.log(`Network/Parse Error: ${e.message}`);
  }
}

checkMenu();
