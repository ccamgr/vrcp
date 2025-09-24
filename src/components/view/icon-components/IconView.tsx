import { useTheme } from "@react-navigation/native";
import { isMaterialIconsName, SupportedIconNames } from "./utils";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

interface Props {
  name: SupportedIconNames;
  color?: string;
  size?: number;

  [key: string]: any;
}
const IconSymbol = ({ name, color, size, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <>
      {isMaterialIconsName(name) ? (
        <MaterialIcons
          name={name}
          size={size}
          color={color || theme.colors.text}
          {...rest}
        />
      ) : (
        <MaterialCommunityIcons
          name={name}
          size={size}
          color={color || theme.colors.text}
          {...rest}
        />
      )}
    </>
  );
};

export default IconSymbol;
