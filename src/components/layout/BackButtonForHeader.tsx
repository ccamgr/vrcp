import { spacing } from "@/config/styles";
import { useRouter } from "expo-router";
import IconButton from "../view/icon-components/IconButton";

const BackButtonForHeader = () => {
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
