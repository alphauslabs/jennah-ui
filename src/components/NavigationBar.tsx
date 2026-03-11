import JennahLogo from "../assets/images/LogoBlack.png";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState, useRef, useEffect } from "react";
import { logoutOAuth } from "@/api/auth";
import { useNotifications } from "@/context/NotificationContext";

function statusBadgeClass(status: string) {
  if (status === "COMPLETED") return "text-green-700";
  if (status === "FAILED")    return "text-red-600";
  if (status === "CANCELLED") return "text-gray-500";
  return "text-gray-500";
}

function NotificationBell() {
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((v) => !v); if (!open) markAllRead(); }}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="Notifications"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Job Notifications</span>
            {notifications.length > 0 && (
              <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                Clear all
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-gray-400">
              No notifications yet.<br />Completed, failed, or cancelled jobs will appear here.
            </div>
          ) : (
            <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${!n.isRead ? "bg-blue-50/40" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {n.jobName || n.jobId.slice(0, 8) + "…"}
                      </p>
                      <p className={`text-xs font-medium mt-0.5 ${statusBadgeClass(n.finalStatus)}`}>
                        {n.finalStatus}
                        {n.serviceTier ? ` · ${n.serviceTier}` : ""}
                      </p>
                      {n.errorMessage && (
                        <p className="text-xs text-red-500 mt-0.5 truncate">{n.errorMessage}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {n.occurredAt ? new Date(Number(n.occurredAt) * 1000).toLocaleString() : ""}
                      </p>
                    </div>
                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-blue-500 mt-1 shrink-0" />}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {/* Footer: link to full notification center and settings */}
          <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              View all notifications
            </Link>
            <Link
              to="/settings/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function NavigationBar() {
  const location = useLocation();
  const { user } = useAuth();
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
    <nav className="px-5 md:px-40 py-6 bg-white border-b border-gray-100">
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

              <NotificationBell />

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
                    <Link
                      to="/notifications"
                      className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Notifications
                    </Link>
                    <Link
                      to="/settings/notifications"
                      className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Notification settings
                    </Link>
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
