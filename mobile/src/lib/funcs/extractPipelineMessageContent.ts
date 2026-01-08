import { PipelineContent, PipelineMessage } from "@/generated/vrcpipline/type";
import { parseLocationString, UserLike, WorldLike } from "../vrchat";

export function extractPipelineMessageContent(message: PipelineMessage, user?:UserLike, world?: WorldLike): string[] {
  const res: string[] = []
  switch (message.type) {
    case "friend-location":
      const c_flo = message.content as PipelineContent<"friend-location">;
      res.push(`${user?.displayName ?? c_flo.user.displayName ?? ""}`);
      if (c_flo.location) {
        const {parsedLocation: loc} = parseLocationString(c_flo.location);
        const wName = world?.name ?? loc?.worldId;
        res.push(`${loc ? wName : c_flo.location}`);
      }
      break;
    case "friend-offline":
      const c_fof = message.content as PipelineContent<"friend-offline">;
      res.push(`${user?.displayName ?? c_fof.userId}`);
      break;
    case "friend-online":
      const c_fon = message.content as PipelineContent<"friend-online">;
      res.push(`${user?.displayName ?? c_fon.user.displayName ?? ""}`);
      if (c_fon.location) {
        const {parsedLocation: loc} = parseLocationString(c_fon.location);
        const wName = world?.name ?? loc?.worldId;
        res.push(`${loc ? wName : c_fon.location}`);
      }
      break;
    case "friend-active":
      const c_fac = message.content as PipelineContent<"friend-active">;
      res.push(`${user?.displayName ?? c_fac.user.displayName ?? ""}`);
      break;
    case "friend-update":
      const c_fup = message.content as PipelineContent<"friend-update">;
      res.push(`${user?.displayName ?? c_fup.user.displayName ?? ""}`);
      break;
    case "friend-add":
      const c_fad = message.content as PipelineContent<"friend-add">;
      res.push(`${user?.displayName ?? c_fad.user.displayName ?? ""}`);
      break;
    case "friend-delete":
      const c_fde = message.content as PipelineContent<"friend-delete">;
      res.push(`${user?.displayName ?? c_fde.userId}`);
      break;
  }
  return res;
}