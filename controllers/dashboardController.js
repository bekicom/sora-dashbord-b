const orderSchema = require("../models/Order");
const {
  getBranch1Conn,
  getBranch2Conn,
  getBranch3Conn,
} = require("../config/db");

const Branch1Order = getBranch1Conn().model(
  "Order",
  orderSchema,
  "globalorders"
);
const Branch2Order = getBranch2Conn().model(
  "Order",
  orderSchema,
  "globalorders"
);
const Branch3Order = getBranch3Conn().model(
  "Order",
  orderSchema,
  "globalorders"
);

// ✅ Filial bo‘yicha orderlar (createdAt YOKI order_date bilan)
exports.getBranchOrders = async (req, res) => {
  try {
    const { branch } = req.params;
    const {
      startDate,
      endDate,
      status, // optional
      paymentMethod, // optional
      limit = 200,
      page = 1,
    } = req.query;

    let Model;
    if (branch === "1") Model = Branch1Order;
    else if (branch === "2") Model = Branch2Order;
    else if (branch === "3") Model = Branch3Order;
    else return res.status(400).json({ error: "Noto‘g‘ri filial tanlandi" });

    const filter = {};

    // ✅ Sana oralig‘i (createdAt YOKI order_date)
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      filter.$or = [
        { createdAt: { $gte: start, $lte: end } },
        { order_date: { $gte: start, $lte: end } },
      ];
    }

    // ✅ Status filter
    if (status) {
      const arr = status
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (arr.length) filter.status = { $in: arr };
    }

    // ✅ To‘lov turi filter
    if (paymentMethod) {
      const arr = paymentMethod
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (arr.length) filter.paymentMethod = { $in: arr };
    }

    // ✅ Pagination
    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Model.find(filter)
        .sort({ createdAt: -1, order_date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Model.countDocuments(filter),
    ]);

    res.json({
      total,
      page: Number(page),
      pageSize: Number(limit),
      items: orders,
    });
  } catch (err) {
    console.error("❌ getBranchOrders xato:", err);
    res.status(500).json({ error: "Server xatosi" });
  }
};

// ✅ Filial bo'yicha GURUHLANGAN mahsulotlar
exports.getBranchOrdersGrouped = async (req, res) => {
  try {
    const { branch } = req.params;
    const { startDate, endDate, status, paymentMethod } = req.query;

    let Model;
    if (branch === "1") Model = Branch1Order;
    else if (branch === "2") Model = Branch2Order;
    else if (branch === "3") Model = Branch3Order;
    else return res.status(400).json({ error: "Noto'g'ri filial tanlandi" });

    const matchFilter = {};

    // Sana filtri
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      matchFilter.$or = [
        { createdAt: { $gte: start, $lte: end } },
        { order_date: { $gte: start, $lte: end } },
      ];
    }

    // Status filtri
    if (status) {
      const arr = status.split(",").map((s) => s.trim()).filter(Boolean);
      if (arr.length) matchFilter.status = { $in: arr };
    }

    // Payment filtri
    if (paymentMethod) {
      const arr = paymentMethod.split(",").map((s) => s.trim()).filter(Boolean);
      if (arr.length) matchFilter.paymentMethod = { $in: arr };
    }

    console.log("🔍 Match filter:", matchFilter);

    // MongoDB Aggregation
    const groupedItems = await Model.aggregate([
      { $match: matchFilter },
      
      // items yoki ordered_items fieldini unwind qilish
      {
        $project: {
          items: {
            $ifNull: ["$items", "$ordered_items"]
          },
          createdAt: 1,
          order_date: 1,
        }
      },
      { $unwind: "$items" },
      
      // Mahsulot bo'yicha guruhlash
      {
        $group: {
          _id: {
            $ifNull: ["$items.name", "$items.item_name"]
          },
          itemName: { 
            $first: { $ifNull: ["$items.name", "$items.item_name"] }
          },
          category: { 
            $first: { $ifNull: ["$items.category_name", "$items.category", "Boshqa"] }
          },
          quantity: { $sum: { $ifNull: ["$items.quantity", 1] } },
          subtotal: {
            $sum: {
              $multiply: [
                { $ifNull: ["$items.quantity", 1] },
                { $ifNull: ["$items.price", "$items.unit_price", 0] }
              ]
            }
          },
          orderCount: { $sum: 1 },
        },
      },
      
      // Eng ko'p sotilgan birinchi
      { $sort: { quantity: -1 } },
    ]);

    console.log(`✅ ${groupedItems.length} ta mahsulot guruhlandi`);

    res.json(groupedItems);
  } catch (err) {
    console.error("❌ getBranchOrdersGrouped xato:", err);
    res.status(500).json({ error: "Server xatosi", details: err.message });
  }
};