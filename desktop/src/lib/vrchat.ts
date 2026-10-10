import { openUrl } from "@tauri-apps/plugin-opener";
import { commands } from "../generated/bindings";

export async function sendSelfInvite(worldId: string, instanceId: string): Promise<void> {
  const result = await commands.inviteMyself(worldId, instanceId);
  if (result.status === "error") {
    throw new Error(result.error);
  }
}

export async function launchDirectInstance(
  worldId: string,
  instanceId: string,
): Promise<void> {
  // Do not use URL: VRChat does not decode encoded instance separators.
  const launchUrl = `vrchat://launch/?ref=vrcp&id=${worldId}:${instanceId}&attach=1`;

  try {
    await openUrl(launchUrl);
    void commands
      .logDirectLaunchResult(worldId, instanceId, launchUrl, "dispatched", null)
      .catch((loggingError) =>
        console.error("Failed to write direct launch log", loggingError),
      );
  } catch (error) {
    void commands
      .logDirectLaunchResult(worldId, instanceId, launchUrl, "failed", String(error))
      .catch((loggingError) =>
        console.error("Failed to write direct launch error log", loggingError),
      );
    throw error;
  }
}
