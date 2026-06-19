import { spacing } from "@/configs/styles";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import IconButton from "../view/icon-components/IconButton";
import { StackHeaderRightProps } from "@react-navigation/stack";
import { useAppMenu } from "@/contexts/AppMenuContext";

const MenuButtonForHeader = (props: StackHeaderRightProps) => {
  const { setOpenMenu } = useAppMenu();
  // const pathnames = usePathname().split("/"); // root からのパスを取得 [0] は常に空文字
  // const params = useLocalSearchParams<{ id?: string }>(); // idがあれば取得
  // const isMainTab = pathnames[1] === "maintab";
  // const isModals = pathnames[1] === "modals";

  const onPress = () => setOpenMenu((p) => !p);
  return (
    <IconButton
      style={{ paddingRight: spacing.large }}
      name="menu"
      onPress={onPress}
    />
  );
};

export default MenuButtonForHeader;
