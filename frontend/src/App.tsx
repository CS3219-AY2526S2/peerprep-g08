import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MatchingPage from "./features/matching/pages/MatchingPage.tsx"
import QuestionPage from "./features/questions/pages/QuestionPage.tsx";
import type { ReactNode } from "react";

import Login from "./features/user/pages/Login.tsx";
import Register from "./features/user/pages/Register.tsx";
import Profile from "./features/user/pages/Profile.tsx";
import UserManagement from "./features/user/pages/UserManagement.tsx";
import AdminUpgrade from "./features/user/pages/AdminUpgrade.tsx";
import GenerateOTP from "./features/user/pages/GenerateOtp.tsx";
import Home from "./components/Home.tsx";
import CollabHome from "./features/collab/pages/Home.tsx";
import Room from "./features/collab/pages/Room.tsx";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route
          path="/admin-upgrade"
          element={
            <ProtectedRoute>
              <AdminUpgrade />
            </ProtectedRoute>
          }
        />

        <Route
          path="/generate-otp"
          element={
            <ProtectedRoute>
              <GenerateOTP />
            </ProtectedRoute>
          }
        />

        <Route path="/questions" element={<QuestionPage />} />

        <Route path="/profile" element={<Profile />} />
        
        <Route path="/matching" element={<MatchingPage />} />
        
        <Route
          path="/admin/manage-users"
          element={
            <ProtectedRoute>
              <UserManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
            path='/room'
            element={<CollabHome />}
        />
        <Route
            path='/room/:id'
            element={<Room />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
