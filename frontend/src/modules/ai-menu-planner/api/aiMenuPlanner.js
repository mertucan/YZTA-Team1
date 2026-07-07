import client from "../../../api/client";

export const getMenus = () =>
  client.get("/menus").then((r) => r.data);

export const getMenu = (id) =>
  client.get(`/menus/${id}`).then((r) => r.data);

export const generateMenu = ({ week_start_date, budget, extra_instructions }) =>
  client.post("/menus/generate", { week_start_date, budget, extra_instructions }).then((r) => r.data);

export const approveMenu = (id) =>
  client.patch(`/menus/${id}/status`, { status: "approved" }).then((r) => r.data);
