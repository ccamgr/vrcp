import { spacing } from "@/config/styles";
import { useTheme } from "@react-navigation/native";
import { Href, Link } from "expo-router";
import { openBrowserAsync } from "expo-web-browser";
import { Platform } from "react-native";

interface Props {
  href: Href & string;
  children?: React.ReactNode;
  [key: string]: any;
}
// this components behaves like a external-link on web, <a> tag, and opens the link in the browser on mobile
export function Atag({ children, href, ...rest }: Props) {
  const theme = useTheme();
  return (
    <Link
      target="_blank" // open in new tab on web, ignored on mobile
      style={[
        {
          color: theme.colors.primary,
          textDecorationLine: "underline",
          paddingHorizontal: spacing.small,
        },
        rest.style,
      ]}
      {...rest}
      href={href}
      onPress={async (event) => {
        if (Platform.OS !== "web") {
          event.preventDefault();
          await openBrowserAsync(href);
        }
      }}
    >
      {children ?? href}
    </Link>
  );
}
