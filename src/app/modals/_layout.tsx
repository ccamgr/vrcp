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

const JsStack = withLayoutContext<
  StackNavigationOptions,
  typeof Navigator,
  StackNavigationState<ParamListBase>,
  StackNavigationEventMap
>(Navigator);

const ModalStack = Platform.OS === 'ios' ? Stack : JsStack;

export default function ModalLayout() {
  return (
    <ModalStack
      screenOptions={{ 
        presentation: 'modal',
        // headerShown: false, // 必要に応じてヘッダーの表示を制御
        headerLeft: BackButtonForHeader,
        headerRight: MenuButtonForHeader,
      }} 
    >
      <ModalStack.Screen
        name="user/[id]"
        options={{title: "User" }}
      />
      <ModalStack.Screen
        name="world/[id]"
        options={{title: "World" }}
      />
      <ModalStack.Screen
        name="instance/[id]"
        options={{title: "Instance" }}
      /> 
      <ModalStack.Screen
        name="avatar/[id]"
        options={{title: "Avatar" }}
      />
      <ModalStack.Screen
        name="group/[id]"
        options={{title: "Group" }}
      />

      <ModalStack.Screen
        name="feeds"
        options={{title: "Feeds" }}
      />
      <ModalStack.Screen
        name="friendlocations"
        options={{title: "FriendLocations" }}
      />
      <ModalStack.Screen
        name="search"
        options={{title: "Search" }}
      />
    </ModalStack>
  );
}