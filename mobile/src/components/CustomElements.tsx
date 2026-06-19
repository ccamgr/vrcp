import { throttle } from "lodash";
import { useMemo } from "react";
import { TouchableOpacity } from "react-native";
import { Button } from "@react-navigation/elements";

/* custom Components */
const DEFAULT_THROTTLE_MS = 750;

// use This instead of TouchableOpacity directly
export const TouchableEx = (
  props: React.ComponentProps<typeof TouchableOpacity>,
) => {
  const safeOnPress = useMemo(
    () =>
      props.onPress
        ? throttle(props.onPress, DEFAULT_THROTTLE_MS, { trailing: false })
        : undefined,
    [props.onPress],
  ); // Throttle to prevent multiple rapid taps
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      {...props}
      onPress={safeOnPress} // override
    />
  );
};
// use This instead of Button directly
export const ButtonEx = (props: React.ComponentProps<typeof Button>) => {
  const safeOnPress = useMemo(
    () =>
      props.onPress
        ? throttle(props.onPress, DEFAULT_THROTTLE_MS, { trailing: false })
        : undefined,
    [props.onPress],
  ); // Throttle to prevent multiple rapid taps
  return (
    <Button
      {...props}
      onPress={safeOnPress} // override
    />
  );
};
