import { fontSize, radius, spacing } from "@/configs/styles";
import { CachedImage } from "@/contexts/CacheContext";
import { omitObject } from "@/lib/utils";
import { getStatusColor, getTrustRankColor, getUserIconUrl, GroupLike, isGroupLike, UserLike } from "@/lib/vrchat";
import { Text } from "@react-navigation/elements";
import React from "react";
import { StyleSheet, View } from "react-native";
import IconSymbol from "../icon-components/IconView";
import { useTheme } from "@react-navigation/native";
import { SupportedIconNames } from "../icon-components/utils";


interface Props {
  data: UserLike | GroupLike;
  size?: number; // default 32
  textSize?: number;
  textColor?: string;
  icon?: SupportedIconNames;
  IconStyle?: { [key: string]: any };
  [key: string]: any;
}

const UserOrGroupChip = ({ data, icon, textSize, textColor, size = 32, IconStyle, ...rest }: Props) => {
  const theme = useTheme()
  const isGroupData = isGroupLike(data);
  return (
    <View style={[styles.container, rest.style]} {...omitObject(rest, "style", "IconStyle")}>

      {icon && (
        <IconSymbol name={icon} size={size/2} style={styles.option} />
      )}

      <CachedImage
        src={isGroupData ? data.iconUrl ?? "" : getUserIconUrl(data)}
        style={[
          isGroupData ? styles.squareIcon : styles.icon,
          {
            height: size,
            borderColor: isGroupData ? theme.colors.text : getStatusColor(data)
          },
          IconStyle
        ]}
      />
      <Text numberOfLines={1} style={[styles.text, { color: textColor ?? theme.colors.text, fontSize: textSize ?? fontSize.medium }]}>
        {isGroupData ? data.name : data.displayName}
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    flexGrow: 1,
    flexShrink: 1,
    marginRight: spacing.small,
    marginLeft: spacing.mini,
    // borderColor: "red", borderStyle: "dotted", borderWidth: 1,
  },
  icon : {
    borderRadius: radius.all,
    borderWidth: 1.5,
    aspectRatio: 1,
    margin: spacing.small
  },
  squareIcon : {
    borderRadius: radius.mini,
    borderWidth: 1.5,
    aspectRatio: 1,
    margin: spacing.small
  },
  option: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 1,
  }
});

export default React.memo(UserOrGroupChip);
