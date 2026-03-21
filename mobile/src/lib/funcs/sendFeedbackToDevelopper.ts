import { Platform } from "react-native";

export type FeedbackType = "feedback" | "bug-report" | "request";

const webhookUrl = process.env.EXPO_PUBLIC_DISCORD_WEBHOOK_URL;

export const sendFeedbacktoDevelopper = async (type: FeedbackType, email: string, content: string, logFilePath?: string | null) => {
    const MsgContent =
`----------------
> **Type:** ${type}
> **Email:** ${email}
> **Content:**
> ${content.replace(/\n/g, "\n> ")}
`

      const formData = new FormData();
      formData.append("payload_json", JSON.stringify({
        content: MsgContent
      }));

      // add attachments if there are any (not implemented in this example)
      if (logFilePath) {
        let fileUri = logFilePath;
        if (fileUri) {
          // ensure Android URI has 'file://' prefix
          if (Platform.OS === 'android' && !fileUri.startsWith('file://')) fileUri = `file://${fileUri}`;
          formData.append("file[0]", {
            uri: fileUri,
            name: "vrcp_log.txt",
            type: "text/plain",
          } as any); // 'as any' is used to bypass TypeScript issues with FormData and file uploads in React Native
        }
      }

      const res = await fetch(webhookUrl, {
        method: "POST",
        body: formData,
      });

      return res;

  };
