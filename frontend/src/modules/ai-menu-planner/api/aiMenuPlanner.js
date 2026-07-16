import client from "../../../api/client";

export const getMenus = () => client.get("/menus").then((r) => r.data);

export const getMenu = (id) => client.get(`/menus/${id}`).then((r) => r.data);

export const generateMenu = ({ week_start_date, budget, portions, extra_instructions }) =>
  client
    .post("/menus/generate", { week_start_date, budget, portions, extra_instructions })
    .then((r) => r.data);

export const createManualMenu = ({ week_start_date, budget, portions }) =>
  client.post("/menus/manual", { week_start_date, budget, portions }).then((r) => r.data);

export const updateMenuPortions = (id, portions) =>
  client.patch(`/menus/${id}/portions`, { portions }).then((r) => r.data);

export const updateMenuItemPortions = (menuId, itemId, portions) =>
  client.patch(`/menus/${menuId}/items/${itemId}`, { portions }).then((r) => r.data);

export const replaceMenuItemMeal = (menuId, itemId, mealId) =>
  client.patch(`/menus/${menuId}/items/${itemId}/meal`, { meal_id: mealId }).then((r) => r.data);

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
