import { spacing } from "@/configs/styles";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import IconButton from "../view/icon-components/IconButton";
import { StackHeaderRightProps } from "@react-navigation/stack";
import { useMenu } from "@/contexts/MenuContext";

const MenuButtonForHeader = (props: StackHeaderRightProps) => {
  const {setOpenMenu} = useMenu();
  const pathnames = usePathname().split("/"); // root からのパスを取得 [0] は常に空文字
  const params = useLocalSearchParams<{ id?: string }>(); // idがあれば取得
  const isMainTab = pathnames[1] === "maintab";
  const isModal = pathnames[1] === "modals";

  const onPress = () => {
    setOpenMenu(p => !p);
  }
  if (isMainTab) {
    return null; // メインタブでは表示しない
  } else if (isModal) {
    return (
      <IconButton
        style={{ paddingRight: spacing.large }}
        name="menu"
        onPress={onPress}
      />
    );
  } else {
    return null; // その他の画面では表示しない
  }
};

export default MenuButtonForHeader;
