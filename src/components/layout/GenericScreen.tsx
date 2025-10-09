import { spacing } from "@/configs/styles";
import { DrawerRouter, useTheme } from "@react-navigation/native";
import { usePathname, useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SupportedIconNames } from "../view/icon-components/utils";
import { useMenu } from "@/contexts/MenuContext";
import { Drawer } from 'react-native-drawer-layout';
import { Text } from "@react-navigation/elements";
import { useEffect } from "react";
import IconSymbol from "../view/icon-components/IconView";

export interface MenuItem {
  icon?: SupportedIconNames;
  title: string;
  onPress: () => void;
}

interface GenericScreenProps {
  menuItems?: MenuItem[];
  children: React.ReactNode;
}

const GenericScreen = ({
  menuItems,
  children,
}: GenericScreenProps) => {
  const theme = useTheme();
  const path = usePathname();
  const { openMenu, setOpenMenu } = useMenu();

  useEffect(() => {
    if (!openMenu) return;
    setOpenMenu(false); // close menu on path change
  }, [path]);

  if (menuItems !== undefined) {
    return (
      <View style={styles.screenRoot}>
        
        <Drawer
          direction="rtl"
          drawerStyle={[styles.drawer, { backgroundColor: theme.colors.card }]}
          open={openMenu}
          onOpen={() => setOpenMenu(true)}
          onClose={() => setOpenMenu(false)}
          renderDrawerContent={() => (
            <DrawerContent menuItems={menuItems} setOpenMenu={setOpenMenu} />
          )}
        >
          <View style={styles.screenContainer}>{children}</View>
        </Drawer>
      </View>
    );
  } else {
    return (
      <View style={styles.screenRoot}>
        <View style={styles.screenContainer}>{children}</View>
      </View>
    );
  } 
};

const DrawerContent = ({
  menuItems,
  setOpenMenu,
}: {
  menuItems?: MenuItem[];
  setOpenMenu: (open: boolean) => void;
}) => {
  const theme = useTheme();
  return (
    <View>
      {menuItems?.map((item, index) => {
        const onPress = () => {
          item.onPress();
          setOpenMenu(false);
        }
        return (
          <TouchableOpacity key={`menu-item-${index}-${item.title}`} onPress={onPress} style={styles.drawerItemContainer}>
            {item.icon && (
              <IconSymbol name={item.icon} size={20} color={theme.colors.text} />
            )}
            <Text style={{ color: theme.colors.text }}>{item.title}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    // attach to Root-View
    flex: 1,
  },
  drawer: {
    right: 0,
    width: 200,
    maxWidth: "66%",
    // borderColor: "red", borderStyle: "dashed", borderWidth: 1,
  },
  drawerItemContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.medium,
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.large,
    // borderColor: "blue", borderStyle: "dashed", borderWidth: 1,
  },
  screenContainer: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
    paddingHorizontal: spacing.small,
  },
});

export default GenericScreen;
