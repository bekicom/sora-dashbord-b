const orderSchema = require("../models/Order");
const { branch1Conn, branch2Conn } = require("../config/db");

const Branch1Order = branch1Conn().model("Order", orderSchema, "globalorders");
const Branch2Order = branch2Conn().model("Order", orderSchema, "globalorders");

// Umumiy summary
exports.getAllSummary = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const [branch1Stats, branch2Stats] = await Promise.all([
      Branch1Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ["completed", "paid"] },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: "$final_total" },
          },
        },
      ]),
      Branch2Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfDay, $lte: endOfDay },
            status: { $in: ["completed", "paid"] },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: "$final_total" },
          },
        },
      ]),
    ]);

    res.json({
      branch1: branch1Stats[0] || { totalOrders: 0, totalRevenue: 0 },
      branch2: branch2Stats[0] || { totalOrders: 0, totalRevenue: 0 },
    });
  } catch (err) {
    console.error("❌ getAllSummary xato:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
};

// Filial bo‘yicha orderlar
exports.getBranchOrders = async (req, res) => {
  try {
    const { branch } = req.params;
    let Model;

    if (branch === "1") Model = Branch1Order;
    else if (branch === "2") Model = Branch2Order;
    else return res.status(400).json({ error: "Noto‘g‘ri filial tanlandi" });

    const orders = await Model.find().sort({ createdAt: -1 }).limit(100);

    res.json(orders);
  } catch (err) {
    console.error("❌ getBranchOrders xato:", err.message);
    res.status(500).json({ error: "Server xatosi" });
  }
};
