import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TransactionsPage from "./TransactionsPage";
import Login from "./pages/Login";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/transactions" element={<TransactionsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;