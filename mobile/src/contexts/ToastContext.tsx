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

      // Remove the setTimeout here. Let ToastMessage handle its own unmount animation.
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

const ToastMessage = ({ toast, onClose }: { toast: ToastItem; onClose: () => void }) => {
  const theme = useTheme();
  // Changed any custom types if needed, using generic React Native Theme types as fallback
  const anyTheme = theme as any;

  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current; // Added fade-in/out for smoother effect

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true })
    ]).start();

    // Exit animation triggered after duration
    const timer = setTimeout(() => {
      closeToast();
    }, toast.duration);

    return () => clearTimeout(timer);
  }, []);

  // Function to handle manual or automatic closing
  const closeToast = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -50, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true })
    ]).start(() => {
      onClose();
    });
  };

  const typeColor = toast.type === "success" ? anyTheme.colors.success
    : toast.type === "error" ? anyTheme.colors.error
      : toast.type === "info" ? anyTheme.colors.info
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
    fontWeight: "bold", // Added bold for better hierarchy
  },
  message: {
    fontSize: fontSize.small,
    marginTop: 2, // Added slight spacing
  },
});
