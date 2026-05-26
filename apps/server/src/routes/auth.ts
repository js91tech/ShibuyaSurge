import { Router } from "express";

export const authRouter = Router();

authRouter.post("/token", async (req, res) => {
  const { code } = req.body as { code?: string };
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!code) {
    res.status(400).json({ error: "Missing code" });
    return;
  }

  if (!clientId || !clientSecret || clientSecret === "your_client_secret_here") {
    res.status(503).json({
      error: "Discord OAuth not configured",
      hint: "Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in .env",
    });
    return;
  }

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
    });

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
    };

    if (!tokenRes.ok || !data.access_token) {
      res.status(tokenRes.status).json(data);
      return;
    }

    res.json({ access_token: data.access_token });
  } catch (err) {
    console.error("[auth] token exchange failed", err);
    res.status(500).json({ error: "Token exchange failed" });
  }
});
