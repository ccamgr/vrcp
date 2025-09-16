import GenericScreen from "@/components/layout/GenericScreen";
import globalStyles from "@/config/styles";
import NativeWebsocketModule from "@modules/native-websocket/src/NativeWebsocketModule";
import { Button } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";

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

  // WebSocket demo
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  const inputRef = useRef<TextInput | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [msgs, setMsgs] = useState<{
    mode: "send" | "recv" | "info",
    data: string
  }[]>([]);
  useEffect(() => {
    const demourl = "wss://echo.websocket.org";
    if (wsRef.current) return ; // already connected 
    wsRef.current = new WebSocket(demourl);
    wsRef.current.onerror = (error) => setMsgs((prev) => [...prev, { mode: "info", data: "WebSocket error: " + JSON.stringify(error) }]);
    wsRef.current.onopen = () => setMsgs((prev) => [...prev, { mode: "info", data: "WebSocket connected" }]);
    wsRef.current.onmessage = (event) => setMsgs((prev) => [...prev, { mode: "recv", data: JSON.stringify(event.data) }]);
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
      setMsgs([]);
    };
  },[reconnectTrigger]);
  const sendMessage = (msg: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg);
      setMsgs((prev) => [...prev, { mode: "send", data: msg }]);
    } else {
      setMsgs((prev) => [...prev, { mode: "info", data: "WebSocket not connected" }]);
    }
  }

  // test Native Module
  const [nmHello, setNmHello] = useState<string>("");
  useEffect(() => {
    setNmHello(NativeWebsocketModule.hello());
  },[]);


  return (
    <GenericScreen>

      <Text style={[globalStyles.text, {color: theme.colors.text}]}>
        {TODO_TEXT}
      </Text>
      <Text style={[globalStyles.text, {color: theme.colors.text}]}>
        {nmHello}
      </Text>

      <View style={{display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16}}>
        <TextInput 
          ref={inputRef}
          style={{borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, padding: 8, flex: 1}} placeholder="Type a message..."
          onSubmitEditing={(e) => {
            sendMessage(e.nativeEvent.text);
            inputRef.current?.clear();
          }}
        />
        <Button onPress={() => {
          setReconnectTrigger((prev) => prev + 1);
        }} > Reconnect </Button>
      </View>
      <FlatList
        data={msgs}
        renderItem={({ item }) => (
          <Text style={[globalStyles.text, {color: item.mode === "send" ? theme.colors.primary : item.mode === "recv" ? theme.colors.notification : theme.colors.subText, marginBottom: 4}]}>
            [{item.mode}] {item.data}
          </Text>
        )}
        keyExtractor={(item, index) => index.toString()}
      />
    </GenericScreen>
  );
}

