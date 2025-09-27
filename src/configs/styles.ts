import { Platform, StyleSheet } from "react-native";

const fontWeight = {
  light: '300',
  medium: '500',
  bold: '700',
  black: '900',
};
const fontSize = {
  small: 12,
  medium: 16,
  large: 20,
};
const spacing = {
  mini: 2,
  small: 6,
  medium: 10,
  large: 15,
};
const radius = {
  small: 8,
  medium: 16,
  large: 24,
  all: 1000,
}
const navigationBarHeight = Platform.OS === 'ios' ? 44 : 56; // default 56dp

const globalStyles = StyleSheet.create({
  // container styles
  container: {
    padding: spacing.small,
  },
  containerCentered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.small,
  },
  containerVertical: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: '100%',
    padding: spacing.small,
  },
  containerHorizontal: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: '100%',
    padding: spacing.small,
  },
  headerContainer: {
    width: '100%',
    padding: spacing.small,
    textAlign: "center",
    // borderColor: 'blue', borderWidth: 1, borderStyle: 'solid',
  },
  //text Styles
  header: {
    fontSize: fontSize.large,
    fontWeight: "bold",
  },
  subheader: {
    fontSize: fontSize.medium,
    fontWeight: "bold",
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
  button: {
    padding: spacing.medium,
    borderRadius: 5,
  },
  linkText: { // button with no background
    borderRadius: 5,
    marginHorizontal: spacing.small,
    paddingHorizontal: spacing.small,
    paddingVertical: 0,
  },


  // repeating items except for the first one
  repeatingitemVertical: {
    marginTop: spacing.small,
  },
  repeatingitemHorizontal: {
    marginLeft: spacing.small,
  },
})



export default globalStyles;
export { fontSize, fontWeight, radius, spacing };
export { navigationBarHeight };
