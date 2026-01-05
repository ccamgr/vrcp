import BackButtonForHeader from '@/components/layout/BackButtonForHeader';
import { Stack } from 'expo-router';
import MenuButtonForHeader from '@/components/layout/MenuButtonForHeader';
import { useTranslation } from 'react-i18next';

export default function ModalLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        presentation: 'modal',
        // headerShown: false,
        headerLeft: BackButtonForHeader,
        headerRight: MenuButtonForHeader,
      }}
    >
      <Stack.Screen
        name="appearance"
        options={{ title: t("pages.setting_appearance.label"), headerRight: undefined }} // no menu button
      />
      <Stack.Screen
        name="database"
        options={{ title: t("pages.setting_database.label"), headerRight: undefined }} // no menu button
      />
      <Stack.Screen
        name="notification"
        options={{ title: t("pages.setting_notifications.label"), headerRight: undefined }} // no menu button
      />
      <Stack.Screen
        name="desktopapp"
        options={{ title: t("pages.setting_desktopapp.label"), headerRight: undefined }} // no menu button
      />
      <Stack.Screen
        name="language"
        options={{ title: t("pages.setting_language.label"), headerRight: undefined }} // no menu button
      />
    </Stack>
  );
}
