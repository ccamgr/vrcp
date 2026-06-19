import { spacing } from "@/configs/styles";
import { DrawerRouter, useTheme } from "@react-navigation/native";
import {
  useFocusEffect,
  usePathname,
  useRootNavigationState,
  useRouter,
} from "expo-router";
import { StyleSheet, View } from "react-native";
import { SupportedIconNames } from "../view/icon-components/utils";
import { useAppMenu } from "@/contexts/AppMenuContext";
import { Drawer } from "react-native-drawer-layout";
import { Text } from "@react-navigation/elements";
import { useCallback, useEffect } from "react";
import IconSymbol from "../view/icon-components/IconView";
import { MenuItem } from "./type";
import { ScrollView } from "react-native-gesture-handler";
import { TouchableEx } from "../CustomElements";

interface Props {
  menuItems?: MenuItem[];
  scrollable?: boolean;
  children: React.ReactNode;
}

const GenericScreen = ({ menuItems, scrollable = false, children }: Props) => {
  const theme = useTheme();
  return (
    <View style={styles.screenRoot}>
      <ChildContainer scrollable={scrollable}>{children}</ChildContainer>
    </View>
  );
};

const ChildContainer = ({
  scrollable,
  children,
}: {
  scrollable: boolean;
  children: React.ReactNode;
}) => {
  if (scrollable) {
    return (
      <ScrollView contentContainerStyle={styles.screenContainer}>
        {children}
      </ScrollView>
    );
  } else {
    return <View style={styles.screenContainer}>{children}</View>;
  }
};

const styles = StyleSheet.create({
  screenRoot: {
    // attach to Root-View
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
    paddingHorizontal: spacing.small,

    // borderColor: "blue", borderStyle: "dashed", borderWidth: 1,
  },
});

export default GenericScreen;
