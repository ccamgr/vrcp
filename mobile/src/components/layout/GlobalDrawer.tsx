import { spacing } from "@/configs/styles";
import { StyleSheet, View } from "react-native";
import IconSymbol from "../view/icon-components/IconView";
import { TouchableEx } from "../CustomElements";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { MenuItem } from "./type";
import { Drawer } from "react-native-drawer-layout";
import { useAppMenu } from "@/contexts/AppMenuContext";

const GlobalDrawer = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme();
  const { openMenu, setOpenMenu, menuItems } = useAppMenu();
  return (
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
      {children}
    </Drawer>
  );
};

const DrawerContent = ({
  menuItems,
  setOpenMenu,
}: {
  menuItems: MenuItem[] | null;
  setOpenMenu: (open: boolean) => void;
}) => {
  const theme = useTheme();
  return (
    <View>
      {/* margin & close button */}
      <View style={styles.drawerHeader}>
        <TouchableEx
          onPress={() => setOpenMenu(false)}
          style={styles.closeButton}
        >
          <IconSymbol name="close" size={30} color={theme.colors.text} />
        </TouchableEx>
      </View>
      {/* menu contents */}
      {menuItems?.map((item, index) => {
        if (item.hidden) {
          // skip hidden items
          return null;
        }
        // handle divider
        if (item.type === "divider") {
          return (
            <View
              key={`menu-item-${index}-${item.title}`}
              style={[
                styles.drawerItemDivider,
                { borderBottomColor: theme.colors.subText },
              ]}
            />
          );
        }
        // handle normal item(= button)
        const onPress = () => {
          item.onPress?.();
          setOpenMenu(false);
        };
        return (
          <TouchableEx
            key={`menu-item-${index}-${item.title}`}
            onPress={onPress}
            style={styles.drawerItemContainer}
          >
            {item.icon && (
              <IconSymbol
                name={item.icon}
                size={20}
                color={theme.colors.text}
              />
            )}
            <Text style={{ color: theme.colors.text }}>{item.title}</Text>
          </TouchableEx>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  drawer: {
    right: 0,
    width: 200,
    maxWidth: "66%",
    // borderColor: "red", borderStyle: "dashed", borderWidth: 1,
  },
  drawerHeader: {
    marginTop: spacing.large,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  closeButton: {
    padding: spacing.medium,
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
  drawerItemDivider: {
    marginHorizontal: spacing.medium,
    borderBottomWidth: 1,
    marginVertical: spacing.small,
  },
});

export default GlobalDrawer;
