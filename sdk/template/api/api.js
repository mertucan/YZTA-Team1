import client from "../../../../api/client";

// Buraya bu modüle özel tipleri ekle
export interface __COMPONENT_NAME__Item {
  id: number;
  // ...
}

// Buraya bu modüle özel API çağrılarını ekle
export const getItems = () =>
  client.get<__COMPONENT_NAME__Item[]>("/__MODULE_ID__").then((r) => r.data);
