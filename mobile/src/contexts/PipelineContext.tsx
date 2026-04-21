// src/contexts/PipelineContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useVRChat } from "./VRChatContext";
import { useSetting } from "./SettingContext";
import { PipelineMessage, PipelineType, PipelineContent } from "@/generated/vrcpipline/type";
import { LimitedUserFriend } from "@/generated/vrcapi";
import { convertToLimitedUserFriend } from "@/lib/vrchat";
import StorageWrapper from "@/lib/wrappers/storageWrapper";

interface PipelineContextType {
  messages: PipelineMessage[];
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export const PipelineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const vrc = useVRChat();
  const { settings } = useSetting();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<PipelineMessage[]>([]);

  // Cache Keys
  const FRIENDS_KEY = ["vrc", "state", "friends"];

  // 1. Restore history from storage
  useEffect(() => {
    StorageWrapper.getItemAsync("vrc_state_pipelineHistory")
      .then((v) => {
        if (v) setMessages(JSON.parse(v));
      })
      .catch(console.error);
  }, []);

  // 2. Handle incoming Pipeline messages
  useEffect(() => {
    const msg = vrc.pipeline?.lastMessage;
    if (!msg) return;

    // Avoid duplicate processing (check timestamp and type)
    const lastStored = messages[0];
    if (msg.timestamp === lastStored?.timestamp && msg.type === lastStored?.type) {
      return;
    }

    if (PipelineType.includes(msg.type as any)) {
      handleMessage(msg.type as any, msg.content as any);
      updateHistory(msg);
    }
  }, [vrc.pipeline?.lastMessage]);

  const updateHistory = (msg: PipelineMessage) => {
    setMessages((prev) => {
      const next = [msg, ...prev].slice(0, settings.pipelineOptions_keepMsgNum);
      StorageWrapper.setItemAsync("vrc_state_pipelineHistory", JSON.stringify(next));
      return next;
    });
  };

  const handleMessage = <T extends typeof PipelineType[number]>(
    type: T,
    content: PipelineContent<T>
  ) => {
    switch (type) {
      case "friend-online":
      case "friend-active":
      case "friend-update":
      case "friend-location": {
        const data = content as any;
        const userId = data.userId;
        const user = data.user;
        const location = type === "friend-location" ? data.location : (user.location ?? "offline");

        queryClient.setQueryData<LimitedUserFriend[]>(FRIENDS_KEY, (prev) => {
          if (!prev) return prev;
          const exists = prev.some((f) => f.id === userId);
          if (exists) {
            return prev.map((f) =>
              f.id === userId ? { ...f, ...user, location } : f
            );
          }
          // New friend from pipeline (rare but possible)
          return [...prev, convertToLimitedUserFriend(user)];
        });
        break;
      }

      case "friend-offline": {
        const data = content as any;
        queryClient.setQueryData<LimitedUserFriend[]>(FRIENDS_KEY, (prev) => {
          if (!prev) return prev;
          return prev.map((f) =>
            f.id === data.userId ? { ...f, location: "offline" } : f
          );
        });
        break;
      }

      case "friend-add": {
        const data = content as any;
        queryClient.setQueryData<LimitedUserFriend[]>(FRIENDS_KEY, (prev) => {
          if (!prev) return [convertToLimitedUserFriend(data.user)];
          return [...prev, convertToLimitedUserFriend(data.user)];
        });
        break;
      }

      case "friend-delete": {
        const data = content as any;
        queryClient.setQueryData<LimitedUserFriend[]>(FRIENDS_KEY, (prev) => {
          if (!prev) return prev;
          return prev.filter((f) => f.id !== data.userId);
        });
        break;
      }

      default:
        console.log(`[Pipeline] Unhandled message type: ${type}`);
    }
  };

  return (
    <PipelineContext.Provider value={{ messages }}>
      {children}
    </PipelineContext.Provider>
  );
};

export const usePipeline = () => {
  const context = useContext(PipelineContext);
  if (!context) throw new Error("usePipeline must be used within PipelineProvider");
  return context;
};
