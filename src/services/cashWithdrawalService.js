import api from "./api";

export default {
  getBalance() {
    return api.get("/cash-withdrawals/balance");
  },
  getAll() {
    return api.get("/cash-withdrawals");
  },
  create(amount, reason) {
    return api.post("/cash-withdrawals", { amount, reason });
  }
}
