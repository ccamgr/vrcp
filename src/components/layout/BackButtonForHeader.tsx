import { spacing } from "@/configs/styles";
import { useRouter } from "expo-router";
import IconButton from "../view/icon-components/IconButton";
import { StackHeaderLeftProps } from "@react-navigation/stack";

const BackButtonForHeader = (props: StackHeaderLeftProps) => {
  const router = useRouter();
  return (
    <IconButton
      style={{ paddingRight: spacing.large }}
      name="chevron-left"
      onPress={router.back}
    />
  );
};

export default BackButtonForHeader;
