const express = require("express");
const router = express.Router();
const { getOrderBranch1, getOrderBranch2 } = require("../config/db");

router.get("/branch/:branch", async (req, res) => {
  try {
    const { branch } = req.params;
    let Model;

    if (branch === "1") Model = getOrderBranch1();
    else if (branch === "2") Model = getOrderBranch2();
    else return res.status(400).json({ message: "❌ Noto‘g‘ri filial ID" });

    const { startDate, endDate } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const orders = await Model.find(query).sort({ createdAt: -1 });

    console.log("Topildi:", orders.length);
    res.json(orders);     
  } catch (error) {
    console.error("❌ Orderlarni olishda xato:", error.message);
    res.status(500).json({ message: "Server xatosi" });
  }
});

module.exports = router;
