// index.js
const path = require("path");
const dotenv = require("dotenv");

// Load .env from parent directory FIRST
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Routes
const authRoutes = require("./routes/auth");
const categoryRoutes = require("./routes/categories");
const photoRoutes = require("./routes/photos");
const settingRoutes = require("./routes/settings");
const uploadRoutes = require("./routes/upload");
const videoRoutes = require("./routes/videos");

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   MIDDLEWARE
========================= */

// ✅ Proper CORS for Hostinger + Render
app.use(
  cors({
    origin: "https://sharadvyasphotography.com/", // you can restrict later to your domain
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parser
app.use(express.json());

/* =========================
   DATABASE CONNECTION
========================= */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

/* =========================
   ROUTES
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/videos", videoRoutes);

/* =========================
   SERVER START
========================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
