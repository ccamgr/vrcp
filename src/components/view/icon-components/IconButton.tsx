import { omitObject } from "@/lib/objectUtils";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { TouchableOpacity } from "react-native";
import { isMaterialIconsName, SupportedIconNames } from "./utils";

interface Props {
  onPress: () => void;
  name: SupportedIconNames;
  color?: string;
  size?: number;
  [key: string]: any;
}

const IconButton = ({ onPress, name, color, size, ...rest }: Props) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        },
        rest.style,
      ]}
      {...omitObject(rest, "style")}
      // style={{borderColor: "black", borderWidth: 1, borderStyle: "solid"}}
      onPress={onPress}
    >
      {isMaterialIconsName(name) ? (
        <MaterialIcons
          name={name}
          size={size || 32}
          color={color || theme.colors.text}
        />
      ) : (
        <MaterialCommunityIcons
          name={name}
          size={size || 32}
          color={color || theme.colors.text}
        />
      )}
      {rest.children}
    </TouchableOpacity>
  );
};

export default IconButton;
