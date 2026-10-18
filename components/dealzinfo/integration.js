import { Router } from "express";

import adminRoutes from "./server/routes/admin.js";
import publicRoutes from "./server/routes/public.js";

export default function createDealzRouter(requireAdmin) {
  const router = Router();
  router.use("/admin", requireAdmin, adminRoutes);
  router.use("/", publicRoutes);
  return router;
}
