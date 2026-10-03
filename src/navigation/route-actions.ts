import {
  StackActions,
} from "expo-router/react-navigation";

type AppNavigation = {
  getState: () => { key: string; routeNames: string[] } | undefined;
  getParent: () => unknown;
  dispatch: (action: object) => void;
};

function routeNameFromHref(href: string) {
  const pathname = href.split(/[?#]/, 1)[0].replace(/^\/+|\/+$/g, "");
  return pathname || "index";
}

function findOwningNavigator(
  navigation: unknown,
  routeName: string,
): { navigation: AppNavigation; key: string } | null {
  let candidate = navigation as AppNavigation | undefined;

  while (candidate) {
    const state = candidate.getState();
    if (state?.routeNames.includes(routeName)) {
      return { navigation: candidate, key: state.key };
    }
    candidate = candidate.getParent() as AppNavigation | undefined;
  }

  return null;
}

/**
 * Dispatch directly to the mounted stack that owns the file route. This avoids
 * Expo Router's global routing queue, which can flush too early when Android
 * opens the app as a full-screen alarm over the lock screen.
 */
export function replaceAppRoute(
  navigation: unknown,
  href: string,
  params?: Record<string, unknown>,
) {
  const routeName = routeNameFromHref(href);
  const owner = findOwningNavigator(navigation, routeName);
  if (!owner) return false;

  owner.navigation.dispatch({
    ...StackActions.replace(routeName, params),
    target: owner.key,
  });
  return true;
}

export function pushAppRoute(
  navigation: unknown,
  href: string,
  params?: Record<string, unknown>,
) {
  const routeName = routeNameFromHref(href);
  const owner = findOwningNavigator(navigation, routeName);
  if (!owner) return false;

  owner.navigation.dispatch({
    ...StackActions.push(routeName, params),
    target: owner.key,
  });
  return true;
}
