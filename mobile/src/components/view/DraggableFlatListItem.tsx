import { useTheme } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import { RenderItemParams } from "react-native-draggable-flatlist";
import IconButton from "./icon-components/IconButton";
import { TextInput } from "react-native-gesture-handler";
import { Text } from "@react-navigation/elements";
import { fontSize, radius, spacing } from "@/configs/styles";
import { useState } from "react";
import { TouchableEx } from "../CustomElements";

interface Props extends Partial<RenderItemParams<string>> {
  deletable?: boolean;
  onDelete?: () => void;
  allowInput?: boolean;
  onChangeText?: (text: string) => void;
}

const DraggableFlatListItem = ({
  item,
  drag,
  isActive,
  deletable = false,
  allowInput = false,
  onChangeText,
  onDelete,
}: Props) => {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  return (
    <View style={[styles.container, { opacity: isActive ? 0.8 : 1 }]}>
      <View
        style={[styles.innerContainer, { backgroundColor: theme.colors.card }]}
      >
        <IconButton
          name="drag-handle"
          size={20}
          color={isActive ? theme.colors.primary : theme.colors.text}
          onPressIn={drag}
        />
        {allowInput && isEditing ? (
          <TextInput
            value={item}
            onChangeText={onChangeText}
            autoFocus
            onBlur={() => setIsEditing(false)}
            onSubmitEditing={() => setIsEditing(false)}
            style={[
              styles.text,
              styles.textContainer,
              { color: theme.colors.text },
            ]}
          />
        ) : (
          <TouchableEx
            style={styles.textContainer}
            onPress={() => setIsEditing(true)}
          >
            <Text style={[styles.text, { color: theme.colors.text }]}>
              {item}
            </Text>
          </TouchableEx>
        )}
        {deletable && (
          <IconButton
            name="delete"
            size={20}
            color={theme.colors.subText}
            onPress={onDelete}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.small,
  },
  innerContainer: {
    display: "flex",
    flexDirection: "row",
    paddingHorizontal: spacing.small,
    borderRadius: radius.small,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    marginHorizontal: spacing.small,
    paddingVertical: spacing.small,
    fontSize: fontSize.medium,
    textAlign: "left",
  },
});

export default DraggableFlatListItem;
