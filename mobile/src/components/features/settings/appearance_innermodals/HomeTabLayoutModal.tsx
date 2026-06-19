import { TouchableEx } from "@/components/CustomElements";
import GenericModal from "@/components/layout/GenericModal";
import { ButtonItemForFooter } from "@/components/layout/type";
import IconSymbol from "@/components/view/icon-components/IconView";
import { SupportedIconNames } from "@/components/view/icon-components/utils";
import { fontSize, radius, spacing } from "@/configs/styles";
import { Setting } from "@/contexts/SettingContext";
import { Text } from "@react-navigation/elements";
import { useTheme } from "@react-navigation/native";
import { Slider } from "@miblanchard/react-native-slider"; // ← ここが変わった
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

type HomeTopVariant = Setting["uiOptions_homeTabTopVariant"];
type HomeBottomVariant = Setting["uiOptions_homeTabBottomVariant"];
type HomeSepPos = Setting["uiOptions_homeTabSeparatePos"];

interface Props {
  open: boolean;
  setOpen: (v: boolean) => void;
  defaultValue:
    | {
        top?: HomeTopVariant;
        bottom?: HomeBottomVariant;
        sepPos?: HomeSepPos;
      }
    | undefined;
  onSubmit?: (value: {
    top: HomeTopVariant;
    bottom: HomeBottomVariant;
    sepPos: HomeSepPos;
  }) => void;
}

export const getIconName = (
  v: HomeTopVariant | HomeBottomVariant,
): SupportedIconNames => {
  if (v === "friend-locations") return "map";
  if (v === "feeds") return "rss";
  if (v === "events") return "calendar";
  return "home";
};

const HomeTabLayoutModal = ({
  open,
  setOpen,
  defaultValue,
  onSubmit,
}: Props) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [selectedValue, setSelectedValue] = useState<{
    top: HomeTopVariant;
    bottom: HomeBottomVariant;
    sepPos: HomeSepPos;
  }>({
    top: defaultValue?.top || "feeds",
    bottom: defaultValue?.bottom || "friend-locations",
    sepPos: defaultValue?.sepPos || 30,
  });
  const [lastOpelated, setLastOpelated] = useState<
    "top" | "bottom" | "sepPos" | undefined
  >(undefined);

  const getButtonText = (v: HomeTopVariant | HomeBottomVariant): string => {
    if (v === "friend-locations")
      return t(
        "pages.setting_appearance.innerModals.homeTabLayout.option_friendLocations",
      );
    if (v === "feeds")
      return t(
        "pages.setting_appearance.innerModals.homeTabLayout.option_feeds",
      );
    if (v === "events")
      return t(
        "pages.setting_appearance.innerModals.homeTabLayout.option_events",
      );
    return "";
  };

  const getTextLabel = (v: HomeTopVariant | HomeBottomVariant): string => {
    if (v === "friend-locations")
      return t(
        "pages.setting_appearance.innerModals.homeTabLayout.selectedLabel_friendLocations",
      );
    if (v === "feeds")
      return t(
        "pages.setting_appearance.innerModals.homeTabLayout.selectedLabel_feeds",
      );
    if (v === "events")
      return t(
        "pages.setting_appearance.innerModals.homeTabLayout.selectedLabel_events",
      );
    return "";
  };

  useEffect(() => {
    if (!defaultValue) return;
    const newvalue = {
      top: defaultValue.top || "feeds",
      bottom: defaultValue.bottom || "friend-locations",
      sepPos: defaultValue.sepPos || 30,
    };
    setSelectedValue(newvalue);
  }, [defaultValue]);

  const buttonItems: ButtonItemForFooter[] = [
    {
      // use button as text display only
      type: "text",
      title:
        lastOpelated === "top"
          ? getTextLabel(selectedValue.top ?? "events")
          : lastOpelated === "bottom"
            ? getTextLabel(selectedValue.bottom ?? "feeds")
            : lastOpelated === "sepPos"
              ? t(
                  "pages.setting_appearance.innerModals.homeTabLayout.selectedLabel_sepPos",
                )
              : "",
      flex: 1,
    },
    {
      title: t(
        "pages.setting_appearance.innerModals.homeTabLayout.button_apply",
      ),
      onPress: () => {
        onSubmit?.(selectedValue);
        setOpen(false);
      },
    },
  ];

  return (
    <GenericModal
      size="large"
      showCloseButton
      open={open}
      onClose={() => setOpen(false)}
      buttonItems={buttonItems}
    >
      <View style={styles.container}>
        <View style={styles.variantsContainer}>
          <View>
            <Text style={{ color: theme.colors.subText, textAlign: "center" }}>
              {t(
                "pages.setting_appearance.innerModals.homeTabLayout.section_top",
              )}
            </Text>
            <View style={styles.iconButtonContainer}>
              {["friend-locations", "feeds", "events"].map((value) => (
                <TouchableEx
                  key={`color-schema-option-${value}`}
                  style={[
                    styles.item,
                    {
                      borderColor:
                        value === selectedValue.top
                          ? theme.colors.primary
                          : theme.colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedValue((prev) => ({
                      ...prev,
                      top: value as HomeTopVariant,
                    }));
                    setLastOpelated("top");
                  }}
                >
                  <IconSymbol
                    name={getIconName(value as HomeTopVariant)}
                    size={32}
                    color={theme.colors.text}
                  />
                  <Text
                    style={[
                      { color: theme.colors.text, fontSize: fontSize.small },
                    ]}
                  >
                    {getButtonText(value as HomeTopVariant)}
                  </Text>
                </TouchableEx>
              ))}
            </View>
          </View>
          <View>
            <Text style={{ color: theme.colors.subText, textAlign: "center" }}>
              {t(
                "pages.setting_appearance.innerModals.homeTabLayout.section_bottom",
              )}
            </Text>
            <View style={styles.iconButtonContainer}>
              {["friend-locations", "feeds", "events"].map((value) => (
                <TouchableEx
                  key={`color-schema-option-${value}`}
                  style={[
                    styles.item,
                    {
                      borderColor:
                        value === selectedValue.bottom
                          ? theme.colors.secondary
                          : theme.colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedValue((prev) => ({
                      ...prev,
                      bottom: value as HomeBottomVariant,
                    }));
                    setLastOpelated("bottom");
                  }}
                >
                  <IconSymbol
                    name={getIconName(value as HomeBottomVariant)}
                    size={32}
                    color={theme.colors.text}
                  />
                  <Text
                    style={[
                      { color: theme.colors.text, fontSize: fontSize.small },
                    ]}
                  >
                    {getButtonText(value as HomeBottomVariant)}
                  </Text>
                </TouchableEx>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.sepPosContainer}>
          <Text style={{ color: theme.colors.subText, textAlign: "center" }}>
            {t(
              "pages.setting_appearance.innerModals.homeTabLayout.section_separatePos",
            )}
          </Text>
          <View style={styles.sliderContainer}>
            {/* ヘッダー部分: ラベルと現在の%値を横並び表示 */}
            <Text style={{ color: theme.colors.text }}>
              {Math.round(selectedValue.sepPos)}%
            </Text>
            {/* スライダー本体 */}
            <View style={styles.slider}>
              <Slider
                minimumValue={0}
                maximumValue={100}
                step={10}
                value={[selectedValue.sepPos]}
                onValueChange={(val) => {
                  setSelectedValue((prev) => ({
                    ...prev,
                    sepPos: val[0],
                  }));
                  setLastOpelated("sepPos");
                }}
                // 色設定
                minimumTrackTintColor={theme.colors.primary} // 左側のバーの色
                maximumTrackTintColor={theme.colors.secondary} // 右側のバーの色
                thumbTintColor={theme.colors.text} // ツマミの色
              />
            </View>
          </View>
        </View>
      </View>
    </GenericModal>
  );
};

const styles = StyleSheet.create({
  // innermodal styles
  container: {
    display: "flex",
    // flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.medium,
  },
  variantsContainer: {
    gap: spacing.medium,
  },
  sepPosContainer: {
    alignItems: "center",
  },
  iconButtonContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  item: {
    width: "32%",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.small,
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: radius.small,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.medium,
    gap: spacing.medium,
  },
  slider: {
    width: "80%",
    alignItems: "stretch",
    justifyContent: "center",
  },
});

export default HomeTabLayoutModal;
