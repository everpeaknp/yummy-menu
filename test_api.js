const API_URL = "https://yummy-321287803064.asia-south1.run.app";

async function check(url) {
  try {
    const res = await fetch(url);
    console.log(`${url} -> ${res.status}`);
    if (res.ok) {
        const data = await res.json();
        console.log("Data sample:", JSON.stringify(data).substring(0, 100));
    }
  } catch (e) {
    console.log(`${url} -> Error: ${e.message}`);
  }
}

async function run() {
  const ids = [1, 2, 3, 10, 100];
  const endpoints = [
    (id) => `/menus/restaurant/${id}/grouped`,
    (id) => `/menus/restaurant/${id}`,
    (id) => `/item-categories/restaurant/${id}`,
    (id) => `/products?restaurant_id=${id}`, // Inferred
  ];

  console.log("Checking plain health/docs...");
  await check(`${API_URL}/docs`);
  await check(`${API_URL}/openapi.json`);

  for (const id of ids) {
    console.log(`\nTesting ID: ${id}`);
    for (const ep of endpoints) {
        await check(`${API_URL}${ep(id)}`);
    }
  }
}

run();
