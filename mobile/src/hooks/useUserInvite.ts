import { useCallback, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import { useVRChat } from "@/contexts/VRChatContext";
import { useCurrentUser } from "@/hooks/vrc/useCurrentUser";
import { parseLocationString } from "@/lib/vrchat";
import { extractErrMsg } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export const useUserInvite = (userId: string) => {
  const { inviteApi } = useVRChat();
  const { data: currentUser } = useCurrentUser();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [isSending, setIsSending] = useState(false);

  const requestInvite = useCallback(async () => {
    if (isSending) return;

    setIsSending(true);
    try {
      await inviteApi.requestInvite({ userId });
      showToast(
        "success",
        t("features.userInvite.request_success_title"),
        t("features.userInvite.request_success_message"),
      );
    } catch (error) {
      showToast(
        "error",
        t("features.userInvite.request_failed_title"),
        extractErrMsg(error),
      );
    } finally {
      setIsSending(false);
    }
  }, [inviteApi, isSending, showToast, t, userId]);

  const sendInvite = useCallback(async () => {
    if (isSending) return;

    const instanceId = parseLocationString(currentUser?.location ?? "")
      .parsedLocation?.instanceId;
    if (!instanceId) {
      showToast(
        "error",
        t("features.userInvite.send_failed_title"),
        t("features.userInvite.not_in_inviteable_instance"),
      );
      return;
    }

    setIsSending(true);
    try {
      await inviteApi.inviteUser({ userId, inviteRequest: { instanceId } });
      showToast(
        "success",
        t("features.userInvite.send_success_title"),
        t("features.userInvite.send_success_message"),
      );
    } catch (error) {
      showToast(
        "error",
        t("features.userInvite.send_failed_title"),
        extractErrMsg(error),
      );
    } finally {
      setIsSending(false);
    }
  }, [currentUser?.location, inviteApi, isSending, showToast, t, userId]);

  return { isSending, requestInvite, sendInvite };
};
