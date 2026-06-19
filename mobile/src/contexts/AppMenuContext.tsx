import GenericDialog from "@/components/layout/GenericDialog";
import { MenuItem } from "@/components/layout/type";
import { useFocusEffect, useRouter } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { BackHandler } from "react-native";
// provide menu state globally

interface AppMenuContextType {
  openMenu: boolean; // use in GenericScreen, HeaderMenuButton
  setOpenMenu: React.Dispatch<React.SetStateAction<boolean>>;
  menuItems: MenuItem[] | null; // use in AppMenuDrawer
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[] | null>>;
  handleBack: () => void;
}
const Context = createContext<AppMenuContextType | undefined>(undefined);

const useAppMenu = () => {
  const context = useContext(Context);
  if (!context) throw new Error("useMenu must be used within a MenuProvider");
  return context;
};

const AppMenuProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [openMenu, setOpenMenu] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[] | null>(null);
  const router = useRouter();
  const [openExitDialog, setOpenExitDialog] = useState(false);
  const { t } = useTranslation();

  // close Drawer if open, else go back, else close app
  const handleBack = () => {
    if (openMenu) {
      setOpenMenu(false);
    } else if (router.canGoBack()) {
      router.back();
    } else {
      setOpenExitDialog(true);
    }
  };

  // Handle back button
  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true; // prevent default behavior
    };
    const handler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );
    return () => {
      handler.remove();
    };
  }, [openMenu, router]);

  return (
    <Context.Provider
      value={{
        openMenu,
        setOpenMenu,
        menuItems,
        setMenuItems,
        handleBack,
      }}
    >
      {children}
      <GenericDialog
        open={openExitDialog}
        message={t("components.exitDialog.message")}
        cancelTitle={t("components.exitDialog.button_no")}
        confirmTitle={t("components.exitDialog.button_yes")}
        onCancel={() => setOpenExitDialog(false)}
        onConfirm={BackHandler.exitApp}
      />
    </Context.Provider>
  );
};

/**
 * メニューアイテムの登録用カスタムフック, (static or memorized じゃないとレンダーループするかも)
 */
const useSideMenu = (items: MenuItem[] | null) => {
  const { setMenuItems } = useAppMenu();
  useFocusEffect(
    useCallback(() => {
      setMenuItems(items);
      return () => setMenuItems([]);
    }, [items, setMenuItems]),
  );
};

export { AppMenuProvider, useAppMenu, useSideMenu };
