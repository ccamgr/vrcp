import { spacing } from "@/config/styles";
import { omitObject } from "@/lib/objectUtils";
import { useTheme } from "@react-navigation/native";
import { useCallback, useRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import IconButton from "./icon-components/IconButton";

interface SearchBoxProps {
  onSubmit: (query: string) => void;
  onChangeText?: (text: string) => void;
  changeTextTimeout?: number; // Timeout in milliseconds, default: 500 ()
  placeholder?: string;
  defaultValue?: string;
  [key: string]: any;
}

const SearchBox = ({ onSubmit, onChangeText, changeTextTimeout = 500, placeholder, defaultValue, ...rest }: SearchBoxProps) => {
  const theme = useTheme();
  const ref = useRef<TextInput>(null);
  const queryRef = useRef<string>("");
  const timeoutRef = useRef<number | null>(null);
  const handleChangeText = useCallback((text: string) => {
    queryRef.current = text;
    if (onChangeText) {
      if (changeTextTimeout > 0) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => onChangeText(text), changeTextTimeout);
      } else {
        onChangeText(text);
      }
    }
  }, [changeTextTimeout, onChangeText]);

  const handleSubmit = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (ref.current) ref.current.blur();
    if (queryRef.current) onSubmit(queryRef.current);
  }, [onSubmit]);

  return (
    <View style={[styles.container, rest.style]} {...omitObject(rest, "style")}>
      <TextInput
        ref={ref}
        placeholder={placeholder}
        onChangeText={handleChangeText}
        defaultValue={defaultValue}
        placeholderTextColor={theme.colors.subText}
        style={[styles.input, {color: theme.colors.text}]}
        onSubmitEditing={handleSubmit}
      />
      <IconButton
        style={{ position: "absolute", right: 10, top: 8 }}
        onPress={handleSubmit}
        name='search'
        color={theme.colors.subText}
        size={26}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderColor: 'gray',
    borderWidth: 1,
    borderStyle: 'solid',
    width: '100%',
  },
  input: {
    width: '88%',
    padding: spacing.medium,
    
  }
});


export default SearchBox;