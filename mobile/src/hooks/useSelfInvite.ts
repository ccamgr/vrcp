// src/hooks/useSelfInvite.ts
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { InstanceRegion, InstanceType } from "@/generated/vrcapi/api";
import { useTranslation } from "react-i18next";

export const useSelfInvite = () => {
  const { user } = useAuth();
  const { instancesApi, inviteApi } = useVRChat();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [isInviting, setIsInviting] = useState(false);

  const inviteMyself = useCallback(async (worldId: string, instanceId: string) => {
    if (isInviting) return;
    if (!user?.id) {
      showToast("error", t("features.selfInvite.error_title"), t("features.selfInvite.user_not_found"));
      return;
    }
    setIsInviting(true);
    try {
      // Send an invite to YOURSELF
      await inviteApi.inviteMyselfTo({ worldId, instanceId });

      showToast(
        "success",
        t("features.selfInvite.success_title"),
        t("features.selfInvite.invite_success_message"),
      );
    } catch (error) {
      console.error("Failed to self-invite:", error);
      showToast("error", t("features.selfInvite.failed_title"), String(error));
    } finally {
      setIsInviting(false);
    }
  }, [user?.id, showToast, inviteApi, isInviting, t]);

  const createAndInviteMyself = useCallback(async (worldId: string, type: InstanceType, region: InstanceRegion) => {
    if (isInviting) return;
    if (!user?.id) {
      showToast("error", t("features.selfInvite.error_title"), t("features.selfInvite.user_not_found"));
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
      showToast(
        "success",
        t("features.selfInvite.success_title"),
        t("features.selfInvite.create_success_message"),
      );
    } catch (error) {
      console.error("Failed to create instance and self-invite:", error);
      showToast("error", t("features.selfInvite.failed_title"), String(error));
    } finally {
      setIsInviting(false);
    }
  }, [user?.id, showToast, instancesApi, inviteApi, isInviting, t]);

  // Export isInviting to use it for loading states in UI
  return { inviteMyself, createAndInviteMyself, isInviting };
};
