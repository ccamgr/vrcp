import { fontSize } from "@/config/styles";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { Linking } from "react-native";
import IconButton from "../icon-components/IconButton";

interface Props {
  url: string | undefined;
  text?: string ;
}
const LinkChip = ({ url, text }: Props) => {
  const theme = useTheme();
  return (
    <IconButton
      name="link-variant"
      size={fontSize.large}
      onPress={() => {
        if (url) Linking.openURL(url);
      }}
    >
      <Text style={{color: theme.colors.text, textDecorationLine: "underline"}}>{text || url}</Text>
    </IconButton>
  );
};

export default LinkChip;