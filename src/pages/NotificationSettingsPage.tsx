import { useState } from "react";
import { NavigationBar } from "@/components/NavigationBar";
import { Link } from "react-router-dom";

interface NotificationPreferences {
  channels: {
    inApp: boolean;
    email: boolean;
    slack: boolean;
    webhook: boolean;
  };
  frequency: "immediate" | "digest" | "disabled";
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  slackWebhookUrl: string;
  customWebhookUrl: string;
}

const DEFAULT_PREFS: NotificationPreferences = {
  channels: { inApp: true, email: false, slack: false, webhook: false },
  frequency: "immediate",
  quietHours: { enabled: false, start: "22:00", end: "08:00" },
  slackWebhookUrl: "",
  customWebhookUrl: "",
};

function loadPrefs(): NotificationPreferences {
  try {
    const raw = localStorage.getItem("jennah_notification_prefs");
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

type TestState = "idle" | "testing" | "ok" | "fail" | "cors";

function ConnectionBadge({ state }: { state: TestState }) {
  if (state === "idle")    return null;
  if (state === "testing") return <span className="text-xs text-gray-400">Testing…</span>;
  if (state === "ok")      return <span className="text-xs text-green-600 font-medium">✅ Connection healthy</span>;
  if (state === "cors")    return <span className="text-xs text-yellow-600 font-medium">⚠️ CORS blocked in browser — test from your backend instead</span>;
  return <span className="text-xs text-red-600 font-medium">❌ Connection failed — check URL and try again</span>;
}

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(loadPrefs);
  const [saved, setSaved] = useState(false);
  const [slackState, setSlackState] = useState<TestState>("idle");
  const [webhookState, setWebhookState] = useState<TestState>("idle");

  const save = () => {
    localStorage.setItem("jennah_notification_prefs", JSON.stringify(prefs));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testEndpoint = async (
    url: string,
    body: object,
    setState: (s: TestState) => void,
  ) => {
    if (!url) return;
    setState("testing");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setState(res.ok ? "ok" : "fail");
    } catch (err: any) {
      // Distinguish CORS/network errors from actual failures
      setState(err?.message?.includes("NetworkError") || err?.message?.includes("Failed to fetch")
        ? "cors"
        : "fail");
    }
    setTimeout(() => setState("idle"), 6000);
  };

  const isValidUrl = (s: string) => {
    try { new URL(s); return true; } catch { return false; }
  };

  const CHANNELS: { key: keyof NotificationPreferences["channels"]; label: string; desc: string; disabled?: boolean }[] = [
    { key: "inApp",   label: "In-App",        desc: "Show in the notification bell — always enabled",       disabled: true },
    { key: "email",   label: "Email",          desc: "Send to your account email (configured on backend)" },
    { key: "slack",   label: "Slack",          desc: "Post to a Slack incoming webhook URL" },
    { key: "webhook", label: "Custom Webhook", desc: "POST the full event payload to your endpoint" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <NavigationBar />
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link to="/notifications" className="text-xs text-blue-600 hover:underline">← Notifications</Link>
            <h1 className="text-xl font-semibold text-gray-900 mt-1">Notification Settings</h1>
          </div>
          <button
            onClick={save}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {saved ? "Saved ✓" : "Save changes"}
          </button>
        </div>

        <p className="text-xs text-gray-400">
          Channel preferences are stored in this browser. Email, Slack, and webhook delivery
          requires the backend consumer service to be configured with the corresponding credentials.
        </p>

        {/* Channels */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Notification Channels</h2>
          <div className="divide-y divide-gray-100">
            {CHANNELS.map(({ key, label, desc, disabled }) => (
              <label
                key={key}
                className={`flex items-center justify-between py-3 ${disabled ? "opacity-60" : "cursor-pointer"}`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={prefs.channels[key]}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, channels: { ...p.channels, [key]: e.target.checked } }))
                    }
                    className="h-4 w-4 rounded accent-blue-600 cursor-pointer"
                  />
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Slack configuration */}
        {prefs.channels.slack && (
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800">Slack Webhook</h2>
            <p className="text-xs text-gray-500">
              Create an incoming webhook in your Slack workspace settings and paste the URL below.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/…"
                value={prefs.slackWebhookUrl}
                onChange={(e) => setPrefs((p) => ({ ...p, slackWebhookUrl: e.target.value }))}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
              />
              <button
                disabled={!isValidUrl(prefs.slackWebhookUrl) || slackState === "testing"}
                onClick={() =>
                  testEndpoint(
                    prefs.slackWebhookUrl,
                    { text: "✅ Test notification from Jennah" },
                    setSlackState,
                  )
                }
                className="text-xs px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 transition-colors shrink-0"
              >
                Test
              </button>
            </div>
            <ConnectionBadge state={slackState} />
          </section>
        )}

        {/* Custom webhook configuration */}
        {prefs.channels.webhook && (
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-800">Custom Webhook</h2>
            <p className="text-xs text-gray-500">
              Your endpoint receives a POST with the full event payload. Secure it using the
              HMAC-SHA256 signature header configured on the backend consumer service.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://your-service.example.com/hooks/jennah"
                value={prefs.customWebhookUrl}
                onChange={(e) => setPrefs((p) => ({ ...p, customWebhookUrl: e.target.value }))}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
              />
              <button
                disabled={!isValidUrl(prefs.customWebhookUrl) || webhookState === "testing"}
                onClick={() =>
                  testEndpoint(
                    prefs.customWebhookUrl,
                    { event_type: "test", message: "Jennah test notification", occurred_at: new Date().toISOString() },
                    setWebhookState,
                  )
                }
                className="text-xs px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 transition-colors shrink-0"
              >
                Test
              </button>
            </div>
            <ConnectionBadge state={webhookState} />
          </section>
        )}

        {/* Frequency */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Notification Frequency</h2>
          <div className="space-y-2">
            {(
              [
                { v: "immediate", label: "Immediate",   desc: "Notify as soon as a job reaches a terminal state" },
                { v: "digest",    label: "Daily digest", desc: "Batch notifications into a daily summary" },
                { v: "disabled",  label: "Disabled",     desc: "Do not send notifications (events are still logged)" },
              ] as const
            ).map(({ v, label, desc }) => (
              <label key={v} className="flex items-start gap-3 py-2 cursor-pointer">
                <input
                  type="radio"
                  name="frequency"
                  value={v}
                  checked={prefs.frequency === v}
                  onChange={() => setPrefs((p) => ({ ...p, frequency: v }))}
                  className="mt-0.5 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Quiet hours */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Quiet Hours</h2>
              <p className="text-xs text-gray-400">Suppress notifications during a time window</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-gray-500">Enable</span>
              <input
                type="checkbox"
                checked={prefs.quietHours.enabled}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, quietHours: { ...p.quietHours, enabled: e.target.checked } }))
                }
                className="h-4 w-4 rounded accent-blue-600"
              />
            </label>
          </div>

          {prefs.quietHours.enabled ? (
            <div className="flex gap-6">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Start (do-not-disturb from)</label>
                <input
                  type="time"
                  value={prefs.quietHours.start}
                  onChange={(e) =>
                    setPrefs((p) => ({ ...p, quietHours: { ...p.quietHours, start: e.target.value } }))
                  }
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">End (resume notifications)</label>
                <input
                  type="time"
                  value={prefs.quietHours.end}
                  onChange={(e) =>
                    setPrefs((p) => ({ ...p, quietHours: { ...p.quietHours, end: e.target.value } }))
                  }
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Notifications will be sent at any hour.</p>
          )}
        </section>
      </div>
    </div>
  );
}
