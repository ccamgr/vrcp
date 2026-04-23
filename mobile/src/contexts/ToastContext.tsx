import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { spacing, radius, fontSize } from "@/configs/styles";
import { useTheme } from "@react-navigation/native";
import { TouchableEx } from "@/components/CustomElements";

interface ToastItem {
  id: string;
  type: "info" | "success" | "error";
  title: string;
  message?: string;
  duration: number;
}

interface ToastContextType {
  showToast: (type: "info" | "success" | "error", title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: "info" | "success" | "error", title: string, message?: string, duration: number = 3000) => {
      const id = Date.now().toString();
      setToasts((prev) => {
        let newToasts = [...prev, { id, type, title, message, duration }];
        if (newToasts.length > 3) {
          newToasts = newToasts.slice(newToasts.length - 3);
        }
        return newToasts;
      });

      // 自動で消す
      setTimeout(() => removeToast(id), duration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View pointerEvents="box-none" style={styles.container}>
        {toasts.map((toast) => (
          <ToastMessage key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

const ToastMessage = ({ toast, onClose }: { toast: ToastItem; onClose: () => void }) => {
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;
  useEffect(() => {
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(translateY, { toValue: -100, duration: 100, useNativeDriver: true }).start(() => {
        onClose();
      });
    }, toast.duration);
    return () => clearTimeout(timer);
  }, []);

  const typeColor = toast.type === "success" ? theme.colors.success
    : toast.type === "error" ? theme.colors.error
      : toast.type === "info" ? theme.colors.info
        : theme.colors.text;

  return (
    <Animated.View style={[styles.toast, { borderColor: typeColor, backgroundColor: theme.colors.card, transform: [{ translateY }] }]}>
      <TouchableEx onPress={onClose}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{toast.title}</Text>
        <Text style={[styles.message, { color: theme.colors.text }]}>{toast.message}</Text>
      </TouchableEx>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: spacing.large,
    paddingTop: spacing.small,
    minWidth: "75%",
    maxWidth: "90%",
    alignSelf: "center",
    zIndex: 9999,
    pointerEvents: "box-none",
  },
  toast: {
    marginVertical: 4,
    paddingHorizontal: spacing.medium,
    paddingVertical: spacing.small,
    borderRadius: radius.small,
    borderWidth: 1,
    borderLeftWidth: 6,
    width: "100%",
  },
  title: {
    fontSize: fontSize.medium,
  },
  message: {
    fontSize: fontSize.small,
  },
});

export { ToastProvider, useToast };
