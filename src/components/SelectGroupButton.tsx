import { spacing } from "@/config/styles";
import { omitObject } from "@/lib/objectUtils";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";

interface Props<T> {
  data: T[];
  value: T | null;
  onChange: (value: T) => void;
  isEqual?: (a: T, b: T) => boolean;
  nameExtractor?: (item: T, idx?: number) => React.ReactNode | undefined;
  keyExtractor?: (item: T, idx?: number) => string;
  [key: string]: any; // for additional props
}

const SelectGroupButton = <T extends unknown>({ data, value, onChange, keyExtractor, isEqual, nameExtractor, ...rest }: Props<T>) => {
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
    if (typeof item === 'string' || typeof item === 'number') return `${item}`;
    if (typeof item === 'object') {
      const obj = Object(item);
      return `${obj.displayName ?? obj.name ?? obj.id}`;
    }
    return `item_${idx}`;
  };

  return (
    <View style={[styles.container, rest.style]} {...omitObject(rest, "style")}>
      {data.map((item, idx) => {
        const displayname = _nameExtractor(item,idx);
        return (
          <Text
            key={_keyExtractor(item, idx)}
            style={[
              styles.text,
              {
                width: `${100 / data.length}%`,
                ...(_isEqual(value,item) ? {
                  borderColor: theme.colors.primary,
                  borderWidth: 2,
                  color: theme.colors.primary,
                } : {
                  borderColor: theme.colors.card,
                  borderWidth: 2,
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                }),
                ...(!displayname ? { 
                  color: theme.colors.subText,
                  fontStyle: "italic",
                } : {}),
              },
            ]}
            numberOfLines={1}
            onPress={() => onChange(item)}
          >
            {displayname ?? "*untitled*"}
          </Text>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  text: {
    flex: 1,
    textAlign: "center",
    margin: spacing.mini,
    paddingVertical: spacing.mini,
    paddingHorizontal: spacing.small,
    overflow: "hidden",
    textOverflow: "ellipsis",
    borderRadius: spacing.medium,
  }
});

export default SelectGroupButton;