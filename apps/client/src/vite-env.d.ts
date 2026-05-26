/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISCORD_CLIENT_ID: string;
  readonly VITE_GAME_SERVER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
