export type InventoryManagementItem = {
  width: number;
  height: number;
  count: number;
};

export type InventoryManagementCoords = {
  x: number;
  y: number;
};

export type InventoryManagementPayload = {
  items: InventoryManagementItem[];
  blockedCells: InventoryManagementCoords[];
};

export type InventoryManagementResult = {
  result: Array<
    Array<{
      total: number;
      itemTypes: [number, number, number];
    }>
  > | null;
  error: string | null;
};

export type NativeModulesType = {
  simulateInventoryManagement: (
    payload: InventoryManagementPayload,
  ) => InventoryManagementResult;
};

export type InitPayload = {
  baseUrl: string;
};

export type EventType = "init" | "simulate_inventory_management";

export type BaseEvent<T extends EventType> = {
  type: T;
};

export type InitEvent = BaseEvent<"init"> & {
  payload: InitPayload;
};

export type SimulateInventoryManagementEvent =
  BaseEvent<"simulate_inventory_management"> & {
    payload: InventoryManagementPayload;
  };

export type ResponseType = "init" | "simulate_inventory_management";

export type WorkerEvent = InitEvent | SimulateInventoryManagementEvent;

export type BaseResponse<T extends ResponseType> = {
  type: T;
};

export type InitResponse = BaseResponse<"init"> & {
  success: boolean;
  error?: string;
};

export type SimulateInventoryManagementResponse =
  BaseResponse<"simulate_inventory_management"> & {
    result: InventoryManagementResult;
  };

export type WorkerResponse = InitResponse | SimulateInventoryManagementResponse;
