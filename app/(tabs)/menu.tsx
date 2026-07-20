import { Redirect } from 'expo-router';

// Placeholder route: the tab bar intercepts presses on this tab to open the
// right-side MenuDrawer instead of navigating. If a user somehow lands here
// (deep link, back stack quirk), send them home rather than showing a blank
// screen.
export default function MenuRoute() {
  return <Redirect href="/(tabs)" />;
}
