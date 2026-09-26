// src/contexts/PipelineContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useVRChat } from "./VRChatContext";
import { useSetting } from "./SettingContext";
import {
  PipelineMessage,
  PipelineType,
  PipelineContent,
} from "@/generated/vrcpipline/type";
import { LimitedUserFriend } from "@/generated/vrcapi";
import { convertToLimitedUserFriend } from "@/lib/vrchat";
import StorageWrapper from "@/lib/wrappers/storageWrapper";
import { useAuth } from "./AuthContext";
import { vrcQueryKeys } from "@/lib/queryClient";

interface PipelineContextType {
  messages: PipelineMessage[];
}

const PipelineContext = createContext<PipelineContextType | undefined>(
  undefined,
);

export const PipelineProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const vrc = useVRChat();
  const auth = useAuth();
  const { settings } = useSetting();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<PipelineMessage[]>([]);
  const historyLimitRef = useRef(settings.pipelineOptions_keepMsgNum);
  historyLimitRef.current = settings.pipelineOptions_keepMsgNum;
  const accountId = auth.user?.id;
  const historyStorageKey = accountId
    ? `vrc_pipeline_history_${accountId}`
    : undefined;

  const friendsKey = vrcQueryKeys.friends(accountId ?? "");

  useEffect(() => {
    let cancelled = false;
    setMessages([]);

    if (!historyStorageKey) return;

    StorageWrapper.getItemAsync(historyStorageKey)
      .then((v) => {
        if (cancelled || !v) return;

        const restoredMessages = JSON.parse(v) as PipelineMessage[];
        setMessages((currentMessages) => {
          // Preserve events received while the asynchronous history read was pending.
          const messageKeys = new Set<string>();
          const mergedMessages = [...currentMessages, ...restoredMessages].filter(
            (message) => {
              const key = `${message.timestamp}:${message.type}`;
              if (messageKeys.has(key)) return false;
              messageKeys.add(key);
              return true;
            },
          );
          const nextMessages = mergedMessages.slice(
            0,
            historyLimitRef.current,
          );
          void StorageWrapper.setItemAsync(
            historyStorageKey,
            JSON.stringify(nextMessages),
          ).catch(console.error);
          return nextMessages;
        });
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [historyStorageKey]);

  const updateHistory = useCallback(
    (msg: PipelineMessage) => {
      if (!historyStorageKey) return;

      setMessages((prev) => {
        const next = [msg, ...prev].slice(
          0,
          settings.pipelineOptions_keepMsgNum,
        );
        void StorageWrapper.setItemAsync(historyStorageKey, JSON.stringify(next));
        return next;
      });
    },
    [historyStorageKey, settings.pipelineOptions_keepMsgNum],
  );

  const handleMessage = useCallback(
    <T extends (typeof PipelineType)[number]>(
      type: T,
      content: PipelineContent<T>,
    ) => {
      switch (type) {
        case "friend-online":
        case "friend-active":
        case "friend-update":
        case "friend-location": {
          const data = content as any;
          const userId = data.userId;
          const user = data.user;
          const location =
            type === "friend-location"
              ? data.location
              : (user.location ?? "offline");

          queryClient.setQueryData<LimitedUserFriend[]>(friendsKey, (prev) => {
            if (!prev) return prev;
            const exists = prev.some((f) => f.id === userId);
            if (exists) {
              return prev.map((f) =>
                f.id === userId ? { ...f, ...user, location } : f,
              );
            }
            return [...prev, convertToLimitedUserFriend(user)];
          });
          break;
        }

        case "friend-offline": {
          const data = content as any;
          queryClient.setQueryData<LimitedUserFriend[]>(friendsKey, (prev) => {
            if (!prev) return prev;
            return prev.map((f) =>
              f.id === data.userId ? { ...f, location: "offline" } : f,
            );
          });
          break;
        }

        case "friend-add": {
          const data = content as any;
          queryClient.setQueryData<LimitedUserFriend[]>(friendsKey, (prev) => {
            if (!prev) return [convertToLimitedUserFriend(data.user)];
            return [...prev, convertToLimitedUserFriend(data.user)];
          });
          break;
        }

        case "friend-delete": {
          const data = content as any;
          queryClient.setQueryData<LimitedUserFriend[]>(friendsKey, (prev) => {
            if (!prev) return prev;
            return prev.filter((f) => f.id !== data.userId);
          });
          break;
        }

        default:
          console.log(`[Pipeline] Unhandled message type: ${type}`);
      }
    },
    [friendsKey, queryClient],
  );

  useEffect(() => {
    const msg = vrc.pipeline?.lastMessage;
    if (!msg || !accountId) return;

    // Avoid duplicate processing (check timestamp and type)
    const lastStored = messages[0];
    if (
      msg.timestamp === lastStored?.timestamp &&
      msg.type === lastStored?.type
    ) {
      return;
    }

    if (PipelineType.includes(msg.type as any)) {
      handleMessage(msg.type as any, msg.content as any);
      updateHistory(msg);
    }
  }, [accountId, handleMessage, messages, updateHistory, vrc.pipeline?.lastMessage]);

  return (
    <PipelineContext.Provider value={{ messages }}>
      {children}
    </PipelineContext.Provider>
  );
};

export const usePipeline = () => {
  const context = useContext(PipelineContext);
  if (!context)
    throw new Error("usePipeline must be used within PipelineProvider");
  return context;
};
