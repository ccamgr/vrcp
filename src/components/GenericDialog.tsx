import globalStyles, { radius, spacing } from "@/config/styles";
import { Button, Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { Modal, StyleSheet, View } from "react-native";
interface GenericDialogProps {
  open: boolean;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmTitle?: string;
  cancelTitle?: string;
  colorConfirm?: string;
  colorCancel?: string;    
  // children: React.ReactNode
}

const GenericDialog = ({
  open,
  message,
  onConfirm,
  onCancel,
  confirmTitle,
  cancelTitle,
  colorConfirm,
  colorCancel,
  // children
}: GenericDialogProps) => {
  const theme = useTheme();
  return (
    <Modal
        visible={open}
        animationType="fade"
        backdropColor={"#88888833"}
        onRequestClose={onCancel}
      >
      <View style={styles.modalRoot} >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.dialogMessageContainer}>
            <Text style={[globalStyles.text, { textAlign: "center" }]}>{message}</Text>
          </View>
          <View style={styles.dialogButtonsContainer}>
            <Button style={styles.dialogButton} onPress={onConfirm} color={colorConfirm ?? theme.colors.primary} >{confirmTitle ?? "Confirm"}</Button>
            <Button style={styles.dialogButton} onPress={onCancel} color={colorCancel ?? theme.colors.text} >{cancelTitle ?? "Cancel"}</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    modalRoot: { // attach to Root-View in Modal
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      maxWidth:"90%",
      minWidth: 200,
      maxHeight: "90%",
      minHeight: 150,
      borderRadius: radius.medium,
      padding: spacing.large,
      justifyContent: "center",
      alignItems: "center",
      
      // borderColor: 'blue',
      // borderWidth: 1,
      // borderStyle: 'solid',
    },
    dialogMessageContainer: {
      margin: spacing.medium,
    },
    dialogButtonsContainer: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      padding: spacing.medium,
      borderRadius: radius.small,
    },
    dialogButton: {
      // flex: 1,
      maxWidth: "45%",
      marginHorizontal: spacing.small,
      borderRadius: radius.small,
    },
})

export default GenericDialog;