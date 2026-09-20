export function createNativeModulesWorker() {
  return new Worker(new URL("./native-modules", import.meta.url));
}
