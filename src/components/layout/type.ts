import { DimensionValue } from "react-native";
import { SupportedIconNames } from "../view/icon-components/utils";

export interface ButtonItem {
  title: string;
  onPress?: () => void;
  color?: string;
  variant?: 'plain' | 'tinted' | 'filled';
  disabled?: boolean;
}
export interface ButtonItemForFooter extends ButtonItem {
  flex?: number;
  width?: DimensionValue;
  type?: "button" | "text";
  // align?: "left" | "right";
}


export interface MenuItem {
  icon?: SupportedIconNames;
  title?: string;
  onPress?: () => void;
  type?: "button" | "divider";
  hidden?: boolean;
}