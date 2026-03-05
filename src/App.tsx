import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import Jobs from "./pages/JobsPage";
import CreateJobPage from "./pages/CreateJobPage";
import EditJobPage from "./pages/EditJobsPage";
import ViewJob from "./pages/ViewJobsPage";

function App() {
  console.log("App component rendering");
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-[#f5f5f5]">
          <Routes>
            {/* Default: go straight to jobs */}
            <Route path="/" element={<Navigate to="/jobs" replace />} />

            {/* Auth */}
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<LoginPage />} />

            {/* Projects — silently redirect to jobs (files kept, not shown) */}
            <Route path="/projects" element={<Navigate to="/jobs" replace />} />
            <Route path="/projects/*" element={<Navigate to="/jobs" replace />} />

            {/* Jobs */}
            <Route
              path="/jobs"
              element={
                <ProtectedRoute>
                  <Jobs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/create"
              element={
                <ProtectedRoute>
                  <CreateJobPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:jobId"
              element={
                <ProtectedRoute>
                  <ViewJob />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:jobId/edit"
              element={
                <ProtectedRoute>
                  <EditJobPage />
                </ProtectedRoute>
              }
            />

          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
