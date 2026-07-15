import client from "../../../api/client";

export const getMenus = () => client.get("/menus/").then((r) => r.data);

export const getMenu = (id) => client.get(`/menus/${id}`).then((r) => r.data);

export const generateMenu = ({ week_start_date, budget, extra_instructions }) =>
  client
    .post("/menus/generate", { week_start_date, budget, extra_instructions })
    .then((r) => r.data);

export const createManualMenu = ({ week_start_date, budget }) =>
  client.post("/menus/manual", { week_start_date, budget }).then((r) => r.data);

export const addMealItem = (menuId, { day_of_week, category, meal_id }) =>
  client
    .post(`/menus/${menuId}/items`, { day_of_week, category, meal_id })
    .then((r) => r.data);

export const removeMenuItem = (menuId, itemId) =>
  client.delete(`/menus/${menuId}/items/${itemId}`).then((r) => r.data);

export const approveMenu = (id) =>
  client
    .patch(`/menus/${id}/status`, { status: "approved" })
    .then((r) => r.data);

export const deleteMenu = (id) =>
  client.delete(`/menus/${id}`).then((r) => r.data);

export const getSeasonalRevisions = (menuId) =>
  client.get(`/menus/${menuId}/seasonal-revisions`).then((r) => r.data);
