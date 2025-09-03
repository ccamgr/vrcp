import { radius, spacing } from "@/config/styles";
import { useTheme } from "@react-navigation/native";
import { Modal, StyleSheet, View } from "react-native";
interface GenericModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode
}

const GenericModal = ({
  open,
  onClose,
  children
}: GenericModalProps) => {
  const theme = useTheme();
  return (
    <Modal
        visible={open}
        animationType="fade"
        backdropColor={"#88888833"}
        onRequestClose={onClose}
      >
      <View style={styles.modalRoot}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          {children}
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
      width:"90%",
      maxHeight: "90%",
      minHeight: 200,
      borderRadius: radius.medium,
      padding: spacing.large,
      justifyContent: "center",
      alignItems: "center",
      
      // borderColor: 'blue',
      // borderWidth: 1,
      // borderStyle: 'solid',
    },
})

export default GenericModal;