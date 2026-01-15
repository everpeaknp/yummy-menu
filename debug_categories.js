const API_URL = "https://yummy-321287803064.asia-south1.run.app";
const RESTAURANT_ID = 52;

async function debugCategorization() {
    console.log("--- Starting Debug ---");

    // 1. Fetch Categories
    console.log("\n1. Fetching Categories...");
    const catUrl = `${API_URL}/item-categories/restaurant/${RESTAURANT_ID}`;
    const catRes = await fetch(catUrl);
    
    if (!catRes.ok) {
        console.error(`FAILED to fetch categories: ${catRes.status}`);
        return;
    }
    
    const catJson = await catRes.json();
    const categories = catJson.data || catJson;
    console.log(`Fetched ${categories.length} categories.`);
    categories.forEach(c => console.log(` - Category [${c.id}] "${c.name}" (Type: ${typeof c.id})`));

    // 2. Fetch Menu Items (simulating the flat list from 'grouped')
    console.log("\n2. Fetching Menu Items (grouped endpoint)...");
    const menuUrl = `${API_URL}/menus/restaurant/${RESTAURANT_ID}/grouped`;
    const menuRes = await fetch(menuUrl);
    
    if (!menuRes.ok) {
        console.error(`FAILED to fetch menu: ${menuRes.status}`);
        return;
    }

    const menuJson = await menuRes.json();
    const items = menuJson.data || menuJson;
    console.log(`Fetched ${items.length} items.`);
    
    // Sample a few items
    items.slice(0, 3).forEach(i => {
        console.log(` - Item [${i.id}] "${i.name}" -> CategoryId: ${i.item_category_id} (Type: ${typeof i.item_category_id})`);
    });

    // 3. Test Mapping Logic
    console.log("\n3. Testing Mapping Logic...");
    
    const categoryMap = new Map();
    categories.forEach(cat => {
        categoryMap.set(Number(cat.id), { ...cat, items: [] });
    });
    
    let matched = 0;
    let unmatched = 0;

    items.forEach(item => {
        if (item.item_category_id) {
            const catId = Number(item.item_category_id);
            if (categoryMap.has(catId)) {
                matched++;
                // console.log(`   MATCH: Item ${item.id} -> Cat ${catId}`);
            } else {
                unmatched++;
                console.log(`   NO MATCH: Item ${item.id} has CatID ${catId} which is not in map!`);
            }
        } else {
            unmatched++;
            console.log(`   NO CAT ID: Item ${item.id}`);
        }
    });

    console.log(`\nResult: ${matched} Matched, ${unmatched} Unmatched`);
}

debugCategorization();
