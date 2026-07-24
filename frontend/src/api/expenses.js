import client from "./client";

export const getExpenses     = ()          => client.get("/expenses").then((r) => r.data);
export const getExpenseSummary = ()        => client.get("/expenses/summary").then((r) => r.data);
export const getExpenseAiInsights = ()      => client.get("/expenses/ai-insights").then((r) => r.data);
export const getMaterialExpenses = ()       => client.get("/expenses/materials").then((r) => r.data);
export const createExpense   = (data)      => client.post("/expenses", data).then((r) => r.data);
export const updateExpense   = (id, data)  => client.patch(`/expenses/${id}`, data).then((r) => r.data);
export const deleteExpense   = (id)        => client.delete(`/expenses/${id}`);
