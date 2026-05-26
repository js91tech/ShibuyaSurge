import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load monorepo root .env (npm -w runs with cwd apps/server)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "colyseus";
import { authRouter } from "./routes/auth.js";
import { createMetaRouter } from "./routes/meta.js";
import { ShibuyaRoom } from "./rooms/ShibuyaRoom.js";
import { ROOM_NAME } from "@jjk/shared-protocol";
import { createMetaStore } from "./storage/index.js";

const isProd = process.env.NODE_ENV === "production";
// Railway injects PORT; in local dev fall back to 3001 so existing scripts keep working.
const PORT = Number(process.env.PORT ?? (isProd ? 0 : 3001));

/**
 * Parse CLIENT_URL into an array of allowed origins. Accepts a single URL or a
 * comma-separated list so preview deploys + production + Discord can all be
 * whitelisted at once. Falls back to the local Vite dev origin.
 */
function parseClientOrigins(): string[] {
  const raw = process.env.CLIENT_URL?.trim();
  if (!raw) return ["http://localhost:5173"];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const allowedOrigins = parseClientOrigins();
const corsOptions: cors.CorsOptions = {
  origin: [...allowedOrigins, /\.discordsays\.com$/, /\.up\.railway\.app$/],
  credentials: true,
};

async function main() {
  const store = await createMetaStore();

  const app = express();
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "256kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "jjk-survivors" });
  });

  app.use("/api", authRouter);
  app.use("/api", createMetaRouter(store));

  const httpServer = createServer(app);
  const gameServer = new Server({ server: httpServer });
  // ShibuyaRoom's onMessage signature predates the Colyseus 0.15 registration API
  // (see FIXME in ShibuyaRoom.ts). Type assertion is safe at runtime.
  gameServer
    // @ts-expect-error - ShibuyaRoom legacy onMessage override; see FIXME in ShibuyaRoom.ts
    .define(ROOM_NAME, ShibuyaRoom)
    .filterBy(["instanceId"]);

  httpServer.listen(PORT, () => {
    const boundPort = (httpServer.address() as { port: number } | null)?.port ?? PORT;
    console.log(`[server] HTTP + Colyseus on :${boundPort}`);
    console.log(`[server] Room: ${ROOM_NAME}`);
    console.log(`[server] CLIENT_URL origins: ${allowedOrigins.join(", ")}`);
    console.log(
      `[server] SKIP_INSTANCE_VERIFY=${process.env.SKIP_INSTANCE_VERIFY ?? "unset"}`
    );
  });

  const shutdown = async (sig: string) => {
    console.log(`[server] ${sig} received, shutting down`);
    httpServer.close();
    try {
      await store.close?.();
    } catch (err) {
      console.warn("[server] store close failed", err);
    }
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[server] fatal boot error", err);
  process.exit(1);
});
