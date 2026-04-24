import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
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

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
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
    },
    []
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

const ToastMessage = ({ toast, onClose }: { toast: ToastItem, onClose: () => void }) => {
  const theme = useTheme();

  // 💡 useRef(new...) ではなく、useStateの初期化関数を使って初回のみ安全に生成する
  const [translateY] = useState(() => new Animated.Value(-100));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true })
    ]).start();

    const timer = setTimeout(() => {
      closeToast();
    }, toast.duration);

    return () => clearTimeout(timer);
  }, []);

  const closeToast = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -50, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true })
    ]).start(() => {
      onClose();
    });
  };

  // 💡 テーマに色が設定されていない場合のフォールバックを定義
  const colors = theme.colors as any;
  const typeColor =
    toast.type === "success" ? (colors.success || '#22c55e')
      : toast.type === "error" ? (colors.error || '#ef4444')
        : toast.type === "info" ? (colors.info || '#3b82f6')
          : theme.colors.text;

  return (
    <Animated.View style={[
      styles.toast,
      {
        borderColor: typeColor,
        backgroundColor: theme.colors.card,
        transform: [{ translateY }],
        opacity: opacity
      }
    ]}>
      <TouchableEx onPress={closeToast}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{toast.title}</Text>
        {!!toast.message && (
          <Text style={[styles.message, { color: theme.colors.text }]}>{toast.message}</Text>
        )}
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
    fontWeight: "bold",
  },
  message: {
    fontSize: fontSize.small,
    marginTop: 2,
  },
});
