import { useState } from "react";
import { Link } from "react-router-dom";
import { NavigationBar } from "@/components/NavigationBar";
import { useNotifications } from "@/context/NotificationContext";
import type { ProtoNotification } from "@/context/NotificationContext";

type StatusFilter = "all" | "unread" | "COMPLETED" | "FAILED" | "CANCELLED";

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  COMPLETED: { label: "Completed", badgeClass: "bg-green-100 text-green-700"},
  FAILED:    { label: "Failed",    badgeClass: "bg-red-100 text-red-700"},
  CANCELLED: { label: "Cancelled", badgeClass: "bg-gray-100 text-gray-600"},
};

function assignedServiceLabel(s: string) {
  if (s === "CLOUD_RUN_JOB") return "Cloud Run Job";
  if (s === "CLOUD_BATCH")   return "Cloud Batch";
  return s;
}

function NotificationRow({
  n,
  onMarkRead,
}: {
  n: ProtoNotification;
  onMarkRead: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[n.finalStatus] ?? { label: n.finalStatus, badgeClass: "bg-gray-100 text-gray-600" };
  const occurredDate = n.occurredAt ? new Date(Number(n.occurredAt) * 1000) : null;

  const handleClick = () => {
    if (!n.isRead) onMarkRead(n.id);
    setExpanded((v) => !v);
  };

  return (
    <li className={`bg-white rounded-xl border transition-all ${!n.isRead ? "border-blue-200 shadow-sm" : "border-gray-200"}`}>
      {/* Row header */}
      <div
        className="flex items-start gap-3 px-4 py-4 cursor-pointer select-none"
        onClick={handleClick}
      >
        {/* Unread indicator dot */}
        <span
          className="mt-1.5 w-2 h-2 rounded-full shrink-0"
          style={{ background: !n.isRead ? "#3b82f6" : "transparent" }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {n.jobName || n.jobId.slice(0, 8) + "…"}
            </span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.badgeClass}`}>
              {cfg.label}
            </span>
          </div>

          <p className="text-xs text-gray-500 mt-0.5">
            {n.serviceTier && <span>{n.serviceTier} · </span>}
            {assignedServiceLabel(n.assignedService)}
            {n.userEmail && <span className="ml-1 text-gray-400">· {n.userEmail}</span>}
          </p>

          {/* Error preview (collapsed) */}
          {!expanded && n.errorMessage && (
            <p className="text-xs text-red-500 mt-0.5 truncate">{n.errorMessage}</p>
          )}

          <p className="text-[10px] text-gray-400 mt-1">
            {occurredDate
              ? occurredDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
              : ""}
          </p>
        </div>

        {/* Deep-link to job detail */}
        <Link
          to={`/jobs/${n.jobId}`}
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] font-medium text-blue-600 hover:underline shrink-0 mt-0.5"
        >
          View job →
        </Link>
      </div>

      {/* Expanded detail section */}
      {expanded && (
        <div className="px-9 pb-5 space-y-3 border-t border-gray-100 pt-3">
          {/* Error card */}
          {n.errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Error details</p>
              <p className="text-xs text-red-600 font-mono break-all leading-relaxed">{n.errorMessage}</p>
            </div>
          )}

          {/* Operational metadata */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <div>
              <dt className="text-gray-400">Job ID</dt>
              <dd className="font-mono text-gray-700 break-all">{n.jobId}</dd>
            </div>
            {n.previousStatus && (
              <div>
                <dt className="text-gray-400">Previous status</dt>
                <dd className="text-gray-700">{n.previousStatus}</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-400">Service tier</dt>
              <dd className="text-gray-700">{n.serviceTier || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Assigned service</dt>
              <dd className="text-gray-700">{assignedServiceLabel(n.assignedService) || "—"}</dd>
            </div>
            {n.cloudResourcePath && (
              <div className="col-span-2">
                <dt className="text-gray-400">GCP resource path</dt>
                <dd className="font-mono text-[10px] text-gray-700 break-all">{n.cloudResourcePath}</dd>
              </div>
            )}
            {n.userEmail && (
              <div>
                <dt className="text-gray-400">Submitted by</dt>
                <dd className="text-gray-700">{n.userEmail}</dd>
              </div>
            )}
            {occurredDate && (
              <div>
                <dt className="text-gray-400">Occurred at</dt>
                <dd className="text-gray-700">{occurredDate.toLocaleString()}</dd>
              </div>
            )}
          </dl>

          {/* Retry / Duplicate action for failed jobs */}
          {n.finalStatus === "FAILED" && (
            <div className="flex gap-2 pt-1">
              <Link
                to={`/jobs/create?duplicate=${n.jobId}`}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Retry / Duplicate Job
              </Link>
              <Link
                to={`/jobs/${n.jobId}`}
                className="text-xs border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                View full details
              </Link>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const [filter, setFilter] = useState<StatusFilter>("all");

  const filtered = notifications.filter((n) => {
    if (filter === "unread")    return !n.isRead;
    if (filter === "all")       return true;
    return n.finalStatus === filter;
  });

  const counts = {
    all:       notifications.length,
    unread:    unreadCount,
    COMPLETED: notifications.filter((n) => n.finalStatus === "COMPLETED").length,
    FAILED:    notifications.filter((n) => n.finalStatus === "FAILED").length,
    CANCELLED: notifications.filter((n) => n.finalStatus === "CANCELLED").length,
  };

  const TABS: { key: StatusFilter; label: string }[] = [
    { key: "all",       label: `All (${counts.all})` },
    { key: "unread",    label: `Unread (${counts.unread})` },
    { key: "COMPLETED", label: `Completed (${counts.COMPLETED})` },
    { key: "FAILED",    label: `Failed (${counts.FAILED})` },
    { key: "CANCELLED", label: `Cancelled (${counts.CANCELLED})` },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <NavigationBar />
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-0 mb-5 border-b border-gray-200 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                filter === tab.key
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
            <p className="text-sm text-gray-400">
              {filter === "unread"
                ? "You're all caught up — no unread notifications."
                : filter === "all"
                ? "No notifications yet. Completed, failed, or cancelled jobs will appear here."
                : `No ${filter.toLowerCase()} jobs.`}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((n) => (
              <NotificationRow key={n.id} n={n} onMarkRead={markRead} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
