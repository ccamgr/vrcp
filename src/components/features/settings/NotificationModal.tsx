import GenericModal from "@/components/layout/GenericModal";
import { useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const NotificationModal = ({ open, setOpen }: Props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <GenericModal
      title={t("components.notificationModal.title")}
      showCloseButton
      size="large"
      open={open}
      onClose={() => setOpen(false)}
    >
      <></>
    </GenericModal>
  );
};

export default NotificationModal;
