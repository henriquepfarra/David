
import { fetch } from 'node-fetch';

const PORT = 3001; // Direct backend port
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function run() {
    console.log("1. Testing Connectivity...");
    try {
        const res = await fetch(`${BASE_URL}/`);
        console.log("   Server is reachable.");
    } catch (e) {
        console.error("   CRITICAL: Server not reachable at " + BASE_URL);
        console.error(e);
        return;
    }

    console.log("\n2. Attempting Local Login Mutation...");
    const loginUrl = `${BASE_URL}/api/trpc/auth.localLogin?batch=1`;
    const loginRes = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ "0": { "json": null } }) // trpc standard input
    });

    if (!loginRes.ok) {
        console.error(`   Login Failed: ${loginRes.status} ${loginRes.statusText}`);
        console.error(await loginRes.text());
        return;
    }

    const cookieHeader = loginRes.headers.get('set-cookie');
    if (!cookieHeader) {
        console.error("   CRITICAL: No 'Set-Cookie' header received!");
        return;
    }
    console.log("   Success! Received Cookies:", cookieHeader);

    // Extract the actual session cookie
    const sessionCookie = cookieHeader.split(';')[0];
    console.log("   Using Cookie:", sessionCookie);

    console.log("\n3. Verifying Authentication (auth.me)...");
    const meUrl = `${BASE_URL}/api/trpc/auth.me?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D`;
    const meRes = await fetch(meUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookie
        }
    });

    const meJson = await meRes.json();
    console.log("   Auth Response:", JSON.stringify(meJson, null, 2));

    if (meJson[0] && meJson[0].result && meJson[0].result.data) {
        console.log("\n   ✅ verification PASSED. User is:", meJson[0].result.data.name);
    } else {
        console.error("\n   ❌ verification FAILED. User is null or error.");
    }
}

run().catch(console.error);
