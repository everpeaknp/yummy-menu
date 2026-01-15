const API_URL = "https://yummy-321287803064.asia-south1.run.app";

async function check(name, url) {
  try {
    const res = await fetch(url);
    console.log(`[${name}] ${url} -> ${res.status} ${res.statusText}`);
    if (res.ok) {
        const data = await res.json();
        console.log(`[${name}] Data keys:`, Object.keys(data));
    } else {
        const txt = await res.text();
        console.log(`[${name}] Error Body:`, txt.substring(0, 100));
    }
  } catch (e) {
    console.log(`[${name}] Network Error: ${e.message}`);
  }
}

async function run() {
  const id = 1; // Testing with ID 1
  await check("RESTAURANT", `${API_URL}/restaurants/${id}`);
  await check("MENU", `${API_URL}/menus/restaurant/${id}/grouped`);
  
  // Also check ID 2 just in case
  const id2 = 2;
  await check("RESTAURANT_2", `${API_URL}/restaurants/${id2}`);
  await check("MENU_2", `${API_URL}/menus/restaurant/${id2}/grouped`);
}

run();
