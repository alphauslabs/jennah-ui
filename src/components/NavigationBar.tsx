import JennahLogo from "../assets/images/LogoBlack.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { logoutOAuth } from "@/api/auth";

export function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const pathname = location.pathname.replace(/\/$/, "") || "/";
  const boldNav =
    "text-sm font-bold text-black hover:text-gray-700 transition-colors";
  const normalNav =
    "text-sm font-normal text-grey-600 hover:text-black transition-colors";

  const handleLogout = async () => {
    await logoutOAuth();
  };

  return (
    <nav className="px-8 md:px-40 py-6 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between">
        <a href="/">
          <img src={JennahLogo} alt="Jennah Logo" className="h-7" />
        </a>
        <div className="flex items-center gap-12">
          {user ? (
            <>
              <Link
                to="/jobs"
                className={pathname.startsWith("/jobs") ? boldNav : normalNav}
              >
                Jobs
              </Link>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {user?.name}
                  </span>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 break-words">
                        {user?.name}
                      </p>
                      <p className="text-xs text-gray-500 break-words">
                        {user?.email}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              to="/auth/login"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
