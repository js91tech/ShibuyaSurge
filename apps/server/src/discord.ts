export async function verifyInstanceParticipant(
  accessToken: string,
  instanceId: string,
  userId: string
): Promise<boolean> {
  if (process.env.SKIP_INSTANCE_VERIFY === "true") {
    return true;
  }

  // Local dev / Discord mock mode
  if (
    accessToken === "dev-token" ||
    instanceId === "dev-instance" ||
    instanceId.startsWith("dev-")
  ) {
    return true;
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId || clientId === "your_client_id_here" || !accessToken) {
    console.warn("[discord] skipping instance verify (no Discord config)");
    return true;
  }

  try {
    const url = `https://discord.com/api/applications/${clientId}/activity-instances/${instanceId}/participants`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.warn("[discord] instance verify failed", res.status);
      return process.env.NODE_ENV !== "production";
    }

    const data = (await res.json()) as { participants?: { id: string }[] };
    const participants = data.participants ?? [];
    return participants.some((p) => p.id === userId);
  } catch (err) {
    console.warn("[discord] instance verify error", err);
    return process.env.NODE_ENV !== "production";
  }
}
