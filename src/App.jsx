import { Routes, Route, Navigate } from "react-router-dom";
import { AdvisorFlow } from "./pages/AdvisorFlow.jsx";
import { SharedPlan } from "./pages/SharedPlan.jsx";
import { AdminPage } from "./pages/AdminPage.jsx";

// Top-level routes. "/" is the advisor flow; "/plan/:id" loads a shared plan.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AdvisorFlow />} />
      <Route path="/plan/:id" element={<SharedPlan />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
