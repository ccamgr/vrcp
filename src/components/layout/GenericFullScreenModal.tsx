import { useTheme } from "@react-navigation/native";
import { Modal, StyleSheet, View } from "react-native";
interface GenericModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const GenericFullScreenModal = ({
  open,
  onClose,
  children,
}: GenericModalProps) => {
  const theme = useTheme();
  return (
    <Modal
      visible={open}
      animationType="fade"
      backdropColor={"#88888833"}
      onRequestClose={onClose}
    >
      <View
        style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}
      >
        {children}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    // attach to Root-View in Modal
    flex: 1,
  },
});

export default GenericFullScreenModal;
