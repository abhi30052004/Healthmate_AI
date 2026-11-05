import React, { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, Clock, FileCheck, AlertTriangle, X, ExternalLink } from "lucide-react";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "reminder" | "document" | "quality" | "system";
  read: boolean;
  linkTab?: string;
}

export interface NotificationCenterProps {
  notifications?: AppNotification[];
  onNavigateTab?: (tab: string) => void;
  className?: string;
}

export function NotificationCenter({
  notifications: initialNotifications,
  onNavigateTab,
  className = "",
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Default sample notifications if none provided
  const [notifications, setNotifications] = useState<AppNotification[]>(
    initialNotifications || [
      {
        id: "notif-1",
        title: "Medication Reminder",
        message: "Evening dose: Metformin 500mg scheduled for 8:00 PM.",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        type: "reminder",
        read: false,
        linkTab: "medications",
      },
      {
        id: "notif-2",
        title: "Report Extraction Complete",
        message: "Comprehensive Metabolic Panel has been analyzed with 14 observations.",
        timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        type: "document",
        read: false,
        linkTab: "documents",
      },
      {
        id: "notif-3",
        title: "Doctor Visit Preparation Ready",
        message: "Clinical summary and question checklist generated for upcoming cardiology visit.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        type: "system",
        read: true,
        linkTab: "visit-pack",
      },
    ]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const getNotifIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "reminder":
        return <Clock size={15} className="text-blue" />;
      case "document":
        return <FileCheck size={15} className="text-teal" />;
      case "quality":
        return <AlertTriangle size={15} className="text-amber" />;
      default:
        return <Bell size={15} className="text-emerald" />;
    }
  };

  return (
    <div className={`hm-notification-center ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="hm-icon-btn hm-notif-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        aria-expanded={isOpen}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="hm-notif-badge" aria-label={`${unreadCount} unread notifications`}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="hm-notif-dropdown" role="dialog" aria-label="Notifications list">
          <div className="hm-notif-header">
            <div className="hm-notif-header-title">
              <h4>Notifications</h4>
              {unreadCount > 0 && (
                <span className="hm-notif-unread-pill">{unreadCount} new</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="hm-btn-text-action"
                onClick={markAllAsRead}
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="hm-notif-list">
            {notifications.length === 0 ? (
              <div className="hm-notif-empty">
                <Bell size={24} className="text-muted" />
                <p>No new clinical notifications.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`hm-notif-item ${notif.read ? "is-read" : "is-unread"}`}
                  onClick={() => {
                    markAsRead(notif.id);
                    if (notif.linkTab && onNavigateTab) {
                      onNavigateTab(notif.linkTab);
                      setIsOpen(false);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`hm-notif-icon-circle is-${notif.type}`}>
                    {getNotifIcon(notif.type)}
                  </div>

                  <div className="hm-notif-content">
                    <div className="hm-notif-item-top">
                      <span className="hm-notif-item-title">{notif.title}</span>
                      <span className="hm-notif-time">
                        {new Date(notif.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="hm-notif-message">{notif.message}</p>
                  </div>

                  {!notif.read && <span className="hm-notif-unread-dot" />}
                </div>
              ))
            )}
          </div>

          <div className="hm-notif-footer">
            <span className="hm-notif-footer-hint">HealthMate Secure Alert Feed</span>
          </div>
        </div>
      )}
    </div>
  );
}

