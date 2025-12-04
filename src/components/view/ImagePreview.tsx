import { getUserAgent } from "@/libs/utils";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  View,
  Modal,
  FlatList,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Text,
} from "react-native";
import {
  Gesture,
  PinchGestureHandler,
  PinchGestureHandlerGestureEvent,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import IconButton from "./icon-components/IconButton";
import { radius } from "@/configs/styles";

interface Props {
  imageUrls: string[];
  initialIdx?: number;
  open: boolean;
  onClose: () => void;
}

interface ZoomableImageItemProps {
  uri: string;
  headers: Record<string, string>;
  index: number;
  rotate: number;
  zoomEnabled: boolean;
}

const { width, height } = Dimensions.get("window");

const AnimatedExpoImage = Animated.createAnimatedComponent(Image);

// ZoomableImageItem コンポーネント
const ZoomableImageItem = ({ uri, headers, index, rotate, zoomEnabled }: ZoomableImageItemProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate || 0}deg` },
    ],
  }));

  const isRotateVert = rotate % 180 !== 0;

  const onPinchEvent = (event: PinchGestureHandlerGestureEvent) => {
    if (zoomEnabled) {
      scale.value = event.nativeEvent.scale;
    }
  };

  const onPinchEnd = () => {
    if (zoomEnabled) {
      scale.value = withTiming(1, { duration: 200 });
    }
  };

  return (
    <View style={{ width, height, justifyContent: "center", alignItems: "center" }}>
      <Animated.View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <AnimatedExpoImage
          source={{ uri, headers }}
          contentFit="contain"
          style={[{ width:isRotateVert ? height : width, height:isRotateVert ? width : height }, animatedStyle]}
        />
      </Animated.View>
    </View>
  );
};

// 親コンポーネント
const ImagePreview = ({ imageUrls, initialIdx = 0, open, onClose }: Props) => {
  const [currentIndex, setCurrentIndex] = useState(initialIdx);
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const [rotateMap, setRotateMap] = useState<{ [key: number]: number }>({});
  const renderTrigger = useState(0);

  const headers = { "User-Agent": getUserAgent() };


  useEffect(() => {
    if (!open) {
      setRotateMap({});
    } 
  }, [open]);

  const rotateImage = (direction: "left" | "right") => {
    setRotateMap((prev) => {
      const current = prev[currentIndex] || 0;
      const next = direction === "right" ? (current + 90) % 360 : (current + 270) % 360;
      return { ...prev, [currentIndex]: next };
    });
  };

  const handleSave = async (index: number) => {
    console.log(`Save image at index: ${index}`);
  };

  return (
    <GestureHandlerRootView style={styles.gesturehandlerRoot}>
      <Modal visible={open} transparent={true} onRequestClose={onClose}>
        <FlatList
          data={imageUrls}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomEnabled}
          keyExtractor={(_, idx) => String(idx)}
          renderItem={({ item, index }) => (
            <ZoomableImageItem
              uri={item}
              headers={headers}
              index={index}
              rotate={rotateMap[index] || 0}
              zoomEnabled={zoomEnabled}
            />
          )}
          initialScrollIndex={initialIdx}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
          }}
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        />

        {/* 右上の閉じるボタン */}
        <View style={styles.topRightButtons}>
          <IconButton
            style={styles.topButton}
            name={"save"}
            onPress={() => handleSave(currentIndex)}
          />
          <IconButton
            style={styles.topButton}
            name={"close"}
            onPress={onClose}
          />
        </View>

        {/* 下中央の回転ボタン */}
        <View style={styles.bottomButtons}>
          <IconButton
            style={styles.rotateButton}
            name="rotate-left"
            onPress={() => rotateImage("left")}
          />
          <IconButton
            style={styles.rotateButton}
            name="rotate-right"
            onPress={() => rotateImage("right")}
          />
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  gesturehandlerRoot: { 
    flex: 1, 
    position: "absolute" 
  },
  topRightButtons: {
    position: "absolute",
    top: 40,
    right: 20,
    flexDirection: "row",
  },
  topButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: radius.all,
    backgroundColor: "rgba(136, 136, 136, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomButtons: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rotateButton: {
    marginHorizontal: 20,
    width: 40,
    height: 40,
    borderRadius: radius.all,
    backgroundColor: "rgba(136, 136, 136, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 24,
  },
});

export default ImagePreview;
