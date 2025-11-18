import BackButtonForHeader from '@/components/layout/BackButtonForHeader';
import { Stack, withLayoutContext } from 'expo-router';
import {
  createStackNavigator,
  StackNavigationEventMap,
  StackNavigationOptions,
} from "@react-navigation/stack";
import { ParamListBase, StackNavigationState } from "@react-navigation/native";
import { Platform } from 'react-native';
import MenuButtonForHeader from '@/components/layout/MenuButtonForHeader';

const { Navigator } = createStackNavigator();

// const JsStack = withLayoutContext<
//   StackNavigationOptions,
//   typeof Navigator,
//   StackNavigationState<ParamListBase>,
//   StackNavigationEventMap
// >(Navigator);

// const ModalStack = Platform.OS === 'ios' ? Stack : JsStack;

export default function ModalLayout() {
  return (
    <Stack
      screenOptions={{ 
        presentation: 'modal',
        // headerShown: false, // 必要に応じてヘッダーの表示を制御
        headerLeft: BackButtonForHeader,
        headerRight: MenuButtonForHeader,
      }} 
    >
      <Stack.Screen
        name="user/[id]"
        options={{title: "User" }}
      />
      <Stack.Screen
        name="world/[id]"
        options={{title: "World" }}
      />
      <Stack.Screen
        name="instance/[id]"
        options={{title: "Instance" }}
      /> 
      <Stack.Screen
        name="avatar/[id]"
        options={{title: "Avatar" }}
      />
      <Stack.Screen
        name="group/[id]"
        options={{title: "Group" }}
      />

      <Stack.Screen
        name="events"
        options={{title: "Events", headerRight: undefined }}
      /><Stack.Screen
        name="feeds"
        options={{title: "Feeds", headerRight: undefined }}
      />
      <Stack.Screen
        name="friendlocations"
        options={{title: "FriendLocations", headerRight: undefined }}
      />
      <Stack.Screen
        name="search"
        options={{title: "Search", headerRight: undefined }}
      />
    </Stack>
  );
}