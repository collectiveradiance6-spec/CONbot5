(function () {
  "use strict";

  if (window.__CONBOT5_DISCORD_SDK_READY__) return;
  window.__CONBOT5_DISCORD_SDK_READY__ = true;

  const state = {
    available: false,
    ready: false,
    user: null,
    guildId: null,
    channelId: null,
    instanceId: null,
    error: null,
  };

  window.CONBOT5_DISCORD = {
    state,
    isActivity() {
      return state.available && state.ready;
    },
    getGuildId() {
      return state.guildId || window.ENV_GUILD_ID || "1438103556610723922";
    },
  };

  async function init() {
    try {
      const clientId =
        window.ENV_DISCORD_CLIENT_ID ||
        window.CONBOT5_CONFIG?.DISCORD_CLIENT_ID;

      if (!clientId) {
        state.error = "Missing Discord client ID";
        document.documentElement.dataset.discordActivity = "false";
        return;
      }

      const mod = await import("https://cdn.jsdelivr.net/npm/@discord/embedded-app-sdk/+esm");
      const { DiscordSDK } = mod;

      const sdk = new DiscordSDK(clientId);
      window.CONBOT5_DISCORD.sdk = sdk;

      await sdk.ready();

      state.available = true;
      state.ready = true;

      const params = new URLSearchParams(location.search);
      state.guildId =
        sdk.guildId ||
        params.get("guild_id") ||
        params.get("guild") ||
        window.ENV_GUILD_ID ||
        "1438103556610723922";

      state.channelId =
        sdk.channelId ||
        params.get("channel_id") ||
        null;

      state.instanceId =
        params.get("instance_id") ||
        null;

      window.ENV_GUILD_ID = state.guildId;

      document.documentElement.dataset.discordActivity = "true";

      window.dispatchEvent(
        new CustomEvent("conbot5:discord-ready", {
          detail: { ...state },
        })
      );
    } catch (error) {
      state.error = error?.message || String(error);
      document.documentElement.dataset.discordActivity = "false";

      window.dispatchEvent(
        new CustomEvent("conbot5:discord-error", {
          detail: { error: state.error },
        })
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();