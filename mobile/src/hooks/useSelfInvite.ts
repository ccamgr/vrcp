// src/hooks/useSelfInvite.ts
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { InstanceRegion, InstanceType } from "@/generated/vrcapi/api";

export const useSelfInvite = () => {
  const { user } = useAuth();
  const { instancesApi, inviteApi } = useVRChat();
  const { showToast } = useToast();
  const [isInviting, setIsInviting] = useState(false);

  const inviteMyself = useCallback(async (worldId: string, instanceId: string) => {
    if (!user?.id) {
      showToast("error", "Error", "User not found.");
      return;
    }
    setIsInviting(true);
    try {
      // Send an invite to YOURSELF
      await inviteApi.inviteMyselfTo({ worldId, instanceId });

      showToast("success", "Invited", "Sent an invite to your VRChat client!");
    } catch (error) {
      console.error("Failed to self-invite:", error);
      showToast("error", "Invite Failed", String(error));
    } finally {
      setIsInviting(false);
    }
  }, [user?.id, showToast, inviteApi]);

  const createAndInviteMyself = useCallback(async (worldId: string, type: InstanceType, region: InstanceRegion) => {
    if (!user?.id) {
      showToast("error", "Error", "User not found.");
      return;
    }
    setIsInviting(true);
    try {
      // Create a new instance of the world
      const instanceResponse = await instancesApi.createInstance({
        createInstanceRequest: {
          worldId,
          type,
          region,
        },
      });
      const instanceId = instanceResponse.data.id;

      // Now invite yourself to that instance
      await inviteApi.inviteMyselfTo({ worldId, instanceId });
      showToast("success", "Invited", "Created a new instance and sent an invite to your VRChat client!");
    } catch (error) {
      console.error("Failed to create instance and self-invite:", error);
      showToast("error", "Invite Failed", String(error));
    } finally {
      setIsInviting(false);
    }
  }, [user?.id, showToast, instancesApi, inviteApi]);

  // Export isInviting to use it for loading states in UI
  return { inviteMyself, createAndInviteMyself, isInviting };
};
