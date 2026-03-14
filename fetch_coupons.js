import fs from 'fs';

async function getCoupons() {
    const url = 'https://firestore.googleapis.com/v1/projects/transform-a96c8/databases/(default)/documents/coupons';
    const res = await fetch(url);
    const json = await res.json();
    fs.writeFileSync('coupons_dump2.json', JSON.stringify(json, null, 2));
}

getCoupons();
