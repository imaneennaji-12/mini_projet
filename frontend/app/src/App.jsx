import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/Login";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<h1>Dashboard</h1>} />
      </Routes>
    </BrowserRouter>
  );
}