import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { ask, message, save } from "@tauri-apps/plugin-dialog";
import { commands } from "../generated/bindings";

export function getAutostartEnabled(): Promise<boolean> {
  return isEnabled();
}

export async function setAutostartEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    await enable();
  } else {
    await disable();
  }
  const result = await commands.logAutostartChange(enabled);
  if (result.status === "error") {
    console.error("Failed to write autostart setting log", result.error);
  }
}

export function selectJsonExportPath(): Promise<string | null> {
  return save({
    filters: [{ name: "JSON", extensions: ["json"] }],
    defaultPath: "vrcp_logs_backup.json",
  });
}

export function confirmDeleteAllLogs(): Promise<boolean> {
  return ask("Are you sure you want to delete ALL logs?\nThis action cannot be undone.", {
    title: "Danger: Clear Database",
    kind: "warning",
  });
}

export function confirmDirectLaunch(worldName: string): Promise<boolean> {
  return ask(`Launch VRChat and join ${worldName}?`, {
    title: "Join Instance",
    kind: "info",
  });
}

export async function showNativeMessage(content: string): Promise<void> {
  await message(content);
}
