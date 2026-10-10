import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env
const envFile = readFileSync(resolve(process.cwd(), ".env"), "utf-8");
const env = {};
for (const line of envFile.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    env[key] = val;
  }
}

const heliusKey = env.HELIUS_API_KEY;
const rpcUrl = env.SOLANA_RPC_URL || `https://devnet.helius-rpc.com/?api-key=${heliusKey}`;
const mint = env.NEXT_PUBLIC_DEVNET_TOKEN_2022_MINT;

console.log("=== Testing API & Services ===");
console.log(`1. Target RPC URL: ${rpcUrl.replace(heliusKey, "REDACTED")}`);
console.log(`   API Key length: ${heliusKey?.length || 0} chars`);

async function testRpc() {
  try {
    const start = Date.now();
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getLatestBlockhash",
        params: [{ commitment: "confirmed" }]
      })
    });
    const duration = Date.now() - start;
    if (!res.ok) {
      console.error(`❌ RPC Error: HTTP ${res.status} ${res.statusText}`);
      return false;
    }
    const data = await res.json();
    if (data.error) {
      console.error(`❌ RPC Error:`, data.error);
      return false;
    }
    console.log(`✅ Helius Devnet RPC responding (${duration}ms)`);
    console.log(`   Blockhash: ${data.result.value.blockhash}`);
    console.log(`   Last valid block height: ${data.result.value.lastValidBlockHeight}`);
    return true;
  } catch (err) {
    console.error(`❌ RPC Connection Failed:`, err.message);
    return false;
  }
}

async function testHeliusEnhanced() {
  try {
    const url = `https://api-devnet.helius-rpc.com/v0/addresses/${mint}/transactions?api-key=${heliusKey}&limit=1`;
    const start = Date.now();
    const res = await fetch(url);
    const duration = Date.now() - start;
    if (!res.ok) {
      console.log(`ℹ️ Helius Enhanced API response: HTTP ${res.status} (Note: devnet enhanced index availability varies)`);
    } else {
      const data = await res.json();
      console.log(`✅ Helius Enhanced API active (${duration}ms, returned ${Array.isArray(data) ? data.length : 0} records)`);
    }
  } catch (err) {
    console.log(`⚠️ Helius Enhanced API test skipped:`, err.message);
  }
}

async function testDatabase() {
  try {
    const dbUrl = env.DATABASE_URL;
    console.log(`\n2. Testing Database connection to: ${dbUrl.replace(/:[^:@]*@/, ":***@")}`);
    // Check if port is open
    const urlObj = new URL(dbUrl);
    const host = urlObj.hostname;
    const port = parseInt(urlObj.port || "5432", 10);
    const net = await import("net");
    const socket = new net.Socket();
    await new Promise((resolve, reject) => {
      socket.setTimeout(3000);
      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error("Connection timed out (Postgres not running on port " + port + ")"));
      });
      socket.on("error", (err) => {
        socket.destroy();
        reject(err);
      });
      socket.connect(port, host);
    });
    console.log(`✅ PostgreSQL TCP port ${port} is reachable.`);
  } catch (err) {
    console.log(`⚠️ PostgreSQL notice: ${err.message}`);
    console.log(`   (If running app without local Postgres, ensure Docker or hosted DB is running)`);
  }
}

async function run() {
  const rpcOk = await testRpc();
  if (rpcOk) await testHeliusEnhanced();
  await testDatabase();
}

run();
