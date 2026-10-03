import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { cancelContentSync, readContent, syncContent } from './content-cache';
const TASK = 'geeta-content-refresh-v1';
TaskManager.defineTask(TASK, async () => {
  const expiration = BackgroundTask.addExpirationListener?.(cancelContentSync);
  try { await syncContent(); return (await readContent()).error ? BackgroundTask.BackgroundTaskResult.Failed : BackgroundTask.BackgroundTaskResult.Success; }
  catch { return BackgroundTask.BackgroundTaskResult.Failed; }
  finally { expiration?.remove(); }
});
export async function registerContentBackground() {
  if (Platform.OS !== 'android' || !process.env.EXPO_PUBLIC_CONTENT_API_URL) return;
  await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 360 });
}
