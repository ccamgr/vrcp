import GenericModal from "@/components/layout/GenericModal";
import { ButtonItemForFooter } from "@/components/layout/type";
import LoadingIndicator from "@/components/view/LoadingIndicator";
import SelectGroupButton from "@/components/view/SelectGroupButton";
import { fontSize, spacing } from "@/configs/styles";
import { logger } from "@/lib/logger";
import { useToast } from "@/contexts/ToastContext";
import { FeedbackType, sendFeedbacktoDevelopper } from "@/lib/funcs/sendFeedbackToDevelopper";
import { useTheme } from "@react-navigation/native";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, Text, TextInput } from "react-native";

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const FeedbackModal = ({ open, setOpen }: Props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [type, setType] = useState<FeedbackType>("bug-report");
  const [email, setEmail] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const emailRef = useRef<TextInput>(null);
  const contentRef = useRef<TextInput>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const sendFeedback = async () => {
    if (!type) return;
    if (!email) return emailRef.current?.focus();
    if (!content) return contentRef.current?.focus();

    try {
      setIsLoading(true);
      const logfilePath = type == "bug-report" ? logger.getRecentLogFilePath() : null;
      const res = await sendFeedbacktoDevelopper(type, email, content, logfilePath);
      if (res.ok) {
        showToast("success", "Thank you for your feedback!");
        setOpen(false);
        setContent("");
      } else {
        showToast("error", "oops! failed to send feedback...");
      }
    } catch (error) {
      showToast("error", "oops! failed to send feedback...");
    } finally {
      setIsLoading(false);
    }

  };

  const buttonItems: ButtonItemForFooter[] = [
    {
      title: t("components.feedbackModal.button_cancel"),
      onPress: () => setOpen(false),
    },
    {
      title: t("components.feedbackModal.button_send"),
      flex: 1,
      onPress: sendFeedback,
    },
  ];

  const feedbackTypes: {
    label: string;
    value: FeedbackType;
  }[] = [
      { label: t("components.feedbackModal.type_bug"), value: "bug-report" },
      { label: t("components.feedbackModal.type_feedback"), value: "feedback" },
      { label: t("components.feedbackModal.type_request"), value: "request" },
    ];

  return (
    <GenericModal
      title={t("components.feedbackModal.label")}
      showCloseButton
      buttonItems={buttonItems}
      size="large"
      open={open}
      onClose={() => setOpen(false)}
    >
      {isLoading && (<LoadingIndicator absolute />)}

      <SelectGroupButton
        style={styles.typeSelector}
        data={feedbackTypes}
        value={feedbackTypes.find((item) => item.value === type)}
        onChange={(item) => item && setType(item.value)}
        keyExtractor={(item) => item?.value || ""}
        nameExtractor={(item) => item?.label}
      />

      <TextInput
        ref={emailRef}
        style={[styles.input, { color: theme.colors.text }]}
        placeholder={t("components.feedbackModal.placeholder_email")}
        placeholderTextColor={theme.colors.subText}
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
        inputMode="email"
      />
      <TextInput
        ref={contentRef}
        style={[styles.mlinput, { color: theme.colors.text }]}
        placeholder={t("components.feedbackModal.placeholder_message")}
        placeholderTextColor={theme.colors.subText}
        multiline
        numberOfLines={5}
        value={content}
        onChangeText={setContent}
      />
    </GenericModal>
  );
};


const styles = StyleSheet.create({
  // container styles
  container: {
    padding: spacing.small,
  },
  typeSelector: {
    marginBottom: spacing.medium,
  },
  text: {
    fontSize: fontSize.medium,
    fontWeight: "normal"
  },
  description: {
    fontSize: fontSize.small,
    fontWeight: "normal"
  },

  // form elements
  input: {
    borderColor: 'gray',
    borderWidth: 1,
    width: '100%',
    padding: spacing.medium,
  },
  mlinput: {
    height: 150,
    borderColor: 'gray',
    borderWidth: 1,
    width: '100%',
    padding: spacing.medium,
    marginTop: spacing.small,
    textAlignVertical: 'top',
  },
})

export default FeedbackModal;
