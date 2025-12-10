import globalStyles, { fontSize, radius, spacing } from "@/configs/styles";
import { useTheme } from "@react-navigation/native";
import { Modal, StyleSheet, View } from "react-native";
import { ButtonItemForFooter } from "./type";
import { Button, Text } from "@react-navigation/elements";
import { useMemo } from "react";
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";
import IconButton from "../view/icon-components/IconButton";
import { hide } from "expo-router/build/utils/splash";
interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  showCloseButton?: boolean;
  scrollable?: boolean | "horizontal" | "vertical" | "both"; // if true, vertical only, if "both", horizontal and vertical
  buttonItems?: ButtonItemForFooter[];
  size?: "small" | "normal" | "large" | "full";
  children: React.ReactNode;
}

const GenericModal = ({ open, onClose, children, buttonItems, title, showCloseButton = false, scrollable=false, size = "normal" }: Props) => {
  const theme = useTheme();
  return (
    <Modal
      visible={open}
      animationType="fade"
      backdropColor={"#88888833"}
      onRequestClose={onClose}
    >
      {/* GestureHandlerRootView is needed for DraggableFlatList */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.modalRoot}>
          <View
            style={[
              styles.modalContainer,
              (
                size === "small" ? styles.modalSizeSmall
                : size === "normal" ? styles.modalSizeNormal
                : size === "large" ? styles.modalSizeLarge
                : size === "full" ? styles.modalSizeFull
                : {}),
            { backgroundColor: theme.colors.background },
            ]}
          > 
            { (showCloseButton || title)  && (
              <View style={[styles.titleContainer, {backgroundColor: theme.colors.card}]}>
                {showCloseButton && (
                  <IconButton
                    style={{ paddingRight: spacing.large }}
                    name="chevron-left"
                    onPress={onClose}
                  />
                )}
                {title && (
                  <Text
                    style={[
                      styles.title,
                      { color: theme.colors.text },
                    ]}
                  >
                    {title}
                  </Text>
                )}
              </View>
            )}
            <ChildContainer scrollable={scrollable}>
              {children}
            </ChildContainer>
            <View style={styles.footer}>
              {buttonItems?.map((item, index) => item.type === "text" ? (
                  <Text
                    key={index}
                    style={[
                      styles.footerText,
                      {
                        flex: item.flex,
                        width: item.width,
                        color: item.color || theme.colors.text,
                      }
                    ]}
                  >
                    {item.title}
                  </Text>
                ) : (
                <Button
                  key={index}
                  style={[styles.footerButton, {
                    flex: item.flex,
                    width: item.width,
                  }]}
                  onPress={item.onPress}
                  pointerEvents={item.onPress ? "auto" : "none"}
                  variant={item.variant}
                  color={item.color || theme.colors.text}
                  disabled={item.disabled}
                >
                  {item.title}
                </Button>
              ))}
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const ChildContainer = ({ scrollable, children }: { 
  scrollable: boolean | "horizontal" | "vertical" | "both"; 
  children: React.ReactNode 
}) => {

  if (scrollable === "both") {
    return (
      <ScrollView horizontal>
        <ScrollView contentContainerStyle={styles.childContainer}>
          {children}
        </ScrollView>
      </ScrollView>
    );
  } else if (scrollable) {
    return (
      <ScrollView
        horizontal={scrollable === "horizontal"}
        contentContainerStyle={styles.childContainer}
      >
        {children}
      </ScrollView>
    );
  } else {
    return (
      <View 
        style={styles.childContainer}
      >
        {children}
      </View>
    );
  }
};

const styles = StyleSheet.create({
  modalRoot: {
    // attach to Root-View in Modal
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSizeSmall: {
    width: "80%",
    maxHeight: "50%",
    minHeight: 100,
  },
  modalSizeNormal: {
    width: "90%",
    maxHeight: "75%",
    minHeight: 100,
  },
  modalSizeLarge: {
    width: "98%",
    maxHeight: "90%",
    minHeight: 150,
  },
  modalSizeFull: {
    width: "100%",
    height: "100%",
  },
  modalContainer: {
    borderRadius: radius.small,
    overflow: "hidden",

    // borderColor: 'blue', borderWidth: 1, borderStyle: 'solid',
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: '100%',
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.small,
  },
  title: {
    paddingHorizontal: spacing.small,
    fontSize: fontSize.medium,
    fontWeight: "bold",
    textAlign: "left",
  },
  childContainer: {
    padding: spacing.medium,
  },
  footer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.small,
    paddingHorizontal: spacing.small,
    paddingVertical: spacing.small,
  },
  footerButton: {
    borderRadius: radius.button,
  },
  footerText: {
    borderRadius: radius.button,
    textAlign: "center",
  },
});

export default GenericModal;
