const mongoose = require("mongoose");
const orderSchema = require("../models/Order");

// Global o'zgaruvchilar
let OrderBranch1, OrderBranch2;
let branch1Conn, branch2Conn;

// Filial DB ulanishlari
function connectDB() {
  try {
    // Branch1 (asosiy: users ham shu yerda)
    branch1Conn = mongoose.createConnection(process.env.MONGO_URI_BRANCH1, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Branch2
    branch2Conn = mongoose.createConnection(process.env.MONGO_URI_BRANCH2, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Order modellarni aniqlash
    OrderBranch1 = branch1Conn.model("Order", orderSchema, "globalorders");
    OrderBranch2 = branch2Conn.model("Order", orderSchema, "globalorders");

    // Ulanish holatini log qilish
    branch1Conn.on("connected", () =>
      console.log("✅ Branch1 DB ulandi (users + orders)")
    );
    branch2Conn.on("connected", () => console.log("✅ Branch2 DB ulandi"));

    branch1Conn.on("error", (err) =>
      console.error("❌ Branch1 ulanish xatosi:", err.message)
    );
    branch2Conn.on("error", (err) =>
      console.error("❌ Branch2 ulanish xatosi:", err.message)
    );

    return { branch1Conn, branch2Conn };
  } catch (error) {
    console.error("❌ DB ulanish xatosi:", error.message);
    process.exit(1);
  }
}

// Ulanishlarni qaytaruvchi funksiyalar
function getBranch1Conn() {
  if (!branch1Conn) {
    throw new Error(
      "Branch1 connection not initialized. Call connectDB first."
    );
  }
  return branch1Conn;
}

function getBranch2Conn() {
  if (!branch2Conn) {
    throw new Error(
      "Branch2 connection not initialized. Call connectDB first."
    );
  }
  return branch2Conn;
}

// Order modellarini qaytaruvchi funksiyalar
function getOrderBranch1() {
  if (!OrderBranch1) {
    throw new Error(
      "OrderBranch1 model not initialized. Call connectDB first."
    );
  }
  return OrderBranch1;
}

function getOrderBranch2() {
  if (!OrderBranch2) {
    throw new Error(
      "OrderBranch2 model not initialized. Call connectDB first."
    );
  }
  return OrderBranch2;
}

module.exports = {
  connectDB,
  getBranch1Conn,
  getBranch2Conn,
  getOrderBranch1,
  getOrderBranch2,
};
