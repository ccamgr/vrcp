import GenericScreen from "@/components/layout/GenericScreen";
import globalStyles from "@/config/styles";
import { useVRChat } from "@/contexts/VRChatContext";
import { Button } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";

const TODO_TEXT = `
[ToDo]  
  - webhook for Feed,
  - globally state controll
    - how to handle data pagenation?
    - how to handle data update?
  - push notification for Feed update
`;

export default function Home() {
  const theme = useTheme();
  const vrc = useVRChat();

  const msgListRef = useRef<FlatList<any>>(null);
  const [msgs, setMsgs] = useState<{
    mode: "send" | "recv" | "info",
    data: string
  }[]>([]);

  useEffect(() => {
    if (!vrc.pipeline?.lastMessage) return ;
    const msg = vrc.pipeline.lastMessage;
    const ctt = msg.content ? (
      Object(msg.content)?.["user"]?.["displayName"] 
      ?? Object(msg.content)?.["displayName"]
      ?? Object(msg.content)?.["name"] 
      ?? Object(msg.content)?.["userId"] 
      ?? "<no content>"
    ) : "<no content>";
    setMsgs((prev) => [{mode: "recv", data: `[${msg.type}] ${ctt}`}, ...prev ]);
  }, [vrc.pipeline?.lastMessage])

  return (
    <GenericScreen>

      <Text style={[globalStyles.text, {color: theme.colors.text}]}>
        {TODO_TEXT}
      </Text>
      
      {/* Standard WebSocket Test */}
      <View style={{height: "70%", borderStyle: "solid", borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 8}}>
        <View style={{display: "flex", flexDirection: "row-reverse",  flexWrap: "wrap", gap: 8, paddingVertical: 8}}>
          <Button onPress={() => {
            setMsgs([]);
          }} > Clear </Button>
        </View>
        <FlatList
          ref={msgListRef}
          onContentSizeChange={() => msgListRef.current?.scrollToOffset({offset: 0, animated: true})}
          data={msgs}
          renderItem={({ item }) => (
            <Text style={[globalStyles.text, {color:  item.mode === "recv" ? theme.colors.primary : theme.colors.text, marginBottom: 4}]}>
              {item.data}
            </Text>
          )}
          keyExtractor={(item, index) => index.toString()}
        />
      </View>
    </GenericScreen>
  );
}