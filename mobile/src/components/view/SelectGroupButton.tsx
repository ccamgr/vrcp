import { spacing } from "@/configs/styles";
import { omitObject } from "@/lib/utils";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { TouchableEx } from "../CustomElements";

interface Props<T> {
  data: T[];
  value: T | null;
  onChange: (value: T) => void;
  isEqual?: (a: T, b: T) => boolean;
  nameExtractor?: (item: T, idx?: number) => React.ReactNode | undefined;
  keyExtractor?: (item: T, idx?: number) => string;
  [key: string]: any; // for additional props
}

const SelectGroupButton = <T extends unknown>({
  data,
  value,
  onChange,
  keyExtractor,
  isEqual,
  nameExtractor,
  ...rest
}: Props<T>) => {
  const theme = useTheme();

  const _isEqual = (a: T | null, b: T) => {
    if (a === null) return false;
    if (isEqual) return isEqual(a, b);
    return a === b;
  };
  const _keyExtractor = (item: T, idx: number) => {
    if (keyExtractor) return keyExtractor(item, idx);
    return `selectable_button_${idx}`;
  };
  const _nameExtractor = (item: T, idx: number) => {
    if (nameExtractor) return nameExtractor(item, idx);
    if (typeof item === "string" || typeof item === "number") return `${item}`;
    if (typeof item === "object") {
      const obj = Object(item);
      return `${obj.displayName ?? obj.name ?? obj.id}`;
    }
    return `item_${idx}`;
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scrollView, rest.style]}
      contentContainerStyle={styles.container}
      {...omitObject(rest, "style")}
    >
      {data.map((item, idx) => {
        const displayname = _nameExtractor(item, idx);
        return (
          <TouchableEx
            key={_keyExtractor(item, idx)}
            onPress={() => onChange(item)}
            style={[
              styles.textContainer,
              {
                backgroundColor: theme.colors.card,
                borderColor: _isEqual(value, item)
                  ? theme.colors.primary
                  : theme.colors.card,
                borderWidth: 1,
              },
            ]}
          >
            <Text
              style={[
                styles.text,
                {
                  color: displayname ? theme.colors.text : theme.colors.subText,
                  fontStyle: displayname ? "normal" : "italic",
                },
              ]}
              numberOfLines={1}
            >
              {displayname ?? "*untitled*"}
            </Text>
          </TouchableEx>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.small,
    paddingRight: spacing.small,
  },
  textContainer: {
    maxWidth: 200,
    minWidth: 120,
    paddingVertical: spacing.mini,
    paddingHorizontal: spacing.small,
    borderRadius: spacing.medium,
  },
  text: {
    textAlign: "center",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});

export default SelectGroupButton;
