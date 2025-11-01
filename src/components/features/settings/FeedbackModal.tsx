import GenericModal from "@/components/layout/GenericModal";
import { useTheme } from "@react-navigation/native";
import { Text } from "react-native";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const FeedbackModal = ({ open, setOpen }: Props) => {
  const theme = useTheme();

  return (
    <GenericModal
      title="Feedback"
      showCloseButton
      size="large"
      open={open}
      onClose={() => setOpen(false)}
    >
      <Text style={{ color: theme.colors.text }}>
        pls send your feedback or request for this app to my email:
      </Text>
    </GenericModal>
  );
};

export default FeedbackModal;
