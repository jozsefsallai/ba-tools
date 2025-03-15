import type {
  InitResponse,
  NativeModulesType,
  SimulateInventoryManagementResponse,
  WorkerEvent,
} from "@/workers/types";

import "../../public/wasm/wasm_exec";

let nativeModulesInitialized = false;
let nativeModules: NativeModulesType | null = null;
let error: Error | null = null;

async function loadNativeModules() {
  try {
    // @ts-ignore
    const go = new Go();
    let obj: WebAssembly.WebAssemblyInstantiatedSource;

    if ("instantiateStreaming" in WebAssembly) {
      obj = await WebAssembly.instantiateStreaming(
        fetch("/wasm/main.wasm"),
        go.importObject,
      );
    } else {
      const res = await fetch("/wasm/main.wasm");
      const buffer = await res.arrayBuffer();
      obj = await WebAssembly.instantiate(buffer, go.importObject);
    }

    const wasm = obj.instance;
    go.run(wasm);

    nativeModules = (global as any).NativeModules;
    nativeModulesInitialized = true;
  } catch (err: any) {
    error = err;
  }
}

self.addEventListener("message", async (event: MessageEvent<WorkerEvent>) => {
  switch (event.data.type) {
    case "init": {
      if (!nativeModulesInitialized) {
        await loadNativeModules();
      }

      self.postMessage({
        type: "init",
        success: nativeModulesInitialized,
        error: error ? error.toString() : undefined,
      } satisfies InitResponse);

      break;
    }

    case "simulate_inventory_management": {
      if (!nativeModulesInitialized) {
        await loadNativeModules();
      }

      if (!nativeModules) {
        self.postMessage({
          type: "simulate_inventory_management",
          result: {
            result: null,
            error: "Native modules not loaded",
          },
        } satisfies SimulateInventoryManagementResponse);

        return;
      }

      const simulation = nativeModules.simulateInventoryManagement(
        event.data.payload,
      );

      self.postMessage({
        type: "simulate_inventory_management",
        result: simulation,
      } satisfies SimulateInventoryManagementResponse);

      break;
    }
  }
});
