import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
} from "lucide-react";
import { db } from "../lib/db";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Device } from "@capacitor/device";
import { cn } from "../lib/utils";

export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "task"
  | "flashcard";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  duration?: number; // in ms
}

interface NotificationContextType {
  addNotification: (notification: Omit<AppNotification, "id">) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider",
    );
  }
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const lastCheckedRef = React.useRef<Record<string, number>>({});

  const addNotification = async (notification: Omit<AppNotification, "id">) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { ...notification, id }]);

    // Native notification fallback
    const info = await Device.getInfo();
    if (info.platform === "android" || info.platform === "ios") {
      try {
        const hasPermission = await LocalNotifications.checkPermissions();
        if (hasPermission.display !== 'granted') {
          await LocalNotifications.requestPermissions();
        }
        
        await LocalNotifications.schedule({
          notifications: [
            {
              title: notification.title,
              body: notification.message,
              id: Math.floor(Math.random() * 1000000),
              schedule: { at: new Date(Date.now() + 100) },
              sound: "default",
              attachments: [],
              actionTypeId: "",
              extra: null,
            },
          ],
        });
      } catch (err) {
        console.error("LocalNotifications error:", err);
      }
    } else if ("Notification" in window && Notification.permission === "granted") {
      new Notification(notification.title, {
        body: notification.message,
        icon: "/favicon.ico",
      });
    }

    if (notification.duration !== 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration || 5000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Background checker for reminders
  useEffect(() => {
    const requestPerms = async () => {
      const info = await Device.getInfo();
      if (info.platform === "android" || info.platform === "ios") {
        await LocalNotifications.requestPermissions();
      } else if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    };
    requestPerms();

    const checkReminders = async () => {
      const now = new Date();
      const currentTimeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      const todayStr = now.toDateString();

      // 1. Check Goals/Tasks
      const goals = await db.goals.getAll();
      let goalsUpdated = false;

      for (const goal of goals) {
        if (!goal.isCompleted) {
          // Check Reminder
          if (goal.reminder && !goal.notifiedReminder) {
            const timeDiff = now.getTime() - goal.reminder;
            if (timeDiff >= 0 && timeDiff <= 2 * 60 * 60 * 1000) { // Within 2 hours
              addNotification({
                title: "تذكير بمهمة",
                message: goal.title,
                type: "task",
                duration: 10000,
              });
              goal.notifiedReminder = true;
              goalsUpdated = true;
            }
          }
          // Check Start Date
          if (goal.startDate && !goal.notifiedStart) {
            const timeDiff = now.getTime() - goal.startDate;
            // If it's time to start and not already notified
            if (timeDiff >= 0 && timeDiff <= 60 * 60 * 1000) {
              addNotification({
                title: "حان وقت البدء",
                message: `المهمة "${goal.title}" تبدأ الآن.`,
                type: "info",
                duration: 10000,
              });
              goal.notifiedStart = true;
              goalsUpdated = true;
            }
          }
          // Check Deadline
          if (goal.deadline && !goal.notifiedDeadline) {
            const timeDiff = goal.deadline - now.getTime();
            // If deadline is within 1 hour and not already notified
            if (timeDiff > 0 && timeDiff <= 60 * 60 * 1000) {
              addNotification({
                title: "اقتراب الموعد النهائي",
                message: `المهمة "${goal.title}" تنتهي قريباً.`,
                type: "warning",
                duration: 15000,
              });
              goal.notifiedDeadline = true;
              goalsUpdated = true;
            }
          }

          if (goalsUpdated) {
            await db.goals.save(goal);
            goalsUpdated = false; // Reset for next goal
          }
        }
      }

      // 2. Check Flashcards
      const flashcards = await db.flashcards.getAll();
      const dueCards = flashcards.filter(
        (c) => c.nextReview && c.nextReview <= now.getTime(),
      );
      if (dueCards.length > 0) {
        const notifKey = `flashcards_${todayStr}`;
        if (!lastCheckedRef.current[notifKey]) {
          addNotification({
            title: "مراجعة البطاقات",
            message: `لديك ${dueCards.length} بطاقة تحتاج للمراجعة اليوم.`,
            type: "flashcard",
            duration: 10000,
          });
          lastCheckedRef.current[notifKey] = now.getTime();
        }
      }

      // 3. Check Inbox Messages
      const messages = await db.inbox.getAll();
      messages.forEach((msg) => {
        if (!msg.isRead) {
          const timeDiff = now.getTime() - msg.unlockDate;
          // If unlocked and not already notified
          if (timeDiff >= 0) {
            const notifKey = `inbox_${msg.id}_${todayStr}`;
            if (!lastCheckedRef.current[notifKey]) {
              addNotification({
                title: "رسالة جديدة متاحة",
                message: `الرسالة "${msg.title}" جاهزة للقراءة الآن.`,
                type: "info",
                duration: 15000,
              });
              lastCheckedRef.current[notifKey] = now.getTime();
            }
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 15000); // Check every 15 seconds
    // Run once on mount after a small delay
    setTimeout(checkReminders, 2000);

    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case "task":
        return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
      case "flashcard":
        return <BookOpen className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-olive-500" />;
    }
  };

  return (
    <NotificationContext.Provider
      value={{ addNotification, removeNotification }}
    >
      {children}
      <div className="fixed top-4 md:top-auto md:bottom-6 left-4 right-4 md:right-auto z-[100] flex flex-col gap-3 pointer-events-none md:max-w-sm">
        <AnimatePresence mode="popLayout">
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)", transition: { duration: 0.2 } }}
              className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-olive-200/50 p-4 pointer-events-auto flex gap-4 items-center group relative overflow-hidden"
            >
              {/* Progress Bar for duration */}
              {notif.duration !== 0 && (
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: (notif.duration || 5000) / 1000, ease: "linear" }}
                  className="absolute bottom-0 left-0 h-0.5 bg-olive-900/10"
                />
              )}

              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                notif.type === "success" ? "bg-green-50 text-green-600" :
                notif.type === "warning" ? "bg-amber-50 text-amber-600" :
                notif.type === "task" ? "bg-blue-50 text-blue-600" :
                notif.type === "flashcard" ? "bg-purple-50 text-purple-600" :
                "bg-olive-50 text-olive-600"
              )}>
                {getIcon(notif.type)}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-olive-900 text-sm leading-none">
                  {notif.title}
                </h4>
                <p className="text-olive-600 text-xs mt-1.5 leading-relaxed line-clamp-2">
                  {notif.message}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    removeNotification(notif.id);
                    setTimeout(() => {
                      addNotification({
                        title: notif.title,
                        message: notif.message,
                        type: notif.type,
                        duration: notif.duration,
                      });
                    }, 10 * 60 * 1000);
                  }}
                  className="p-2 text-olive-400 hover:text-olive-900 hover:bg-olive-100 rounded-xl transition-all active:scale-90"
                  title="تذكير لاحقاً"
                >
                  <Clock className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeNotification(notif.id)}
                  className="p-2 text-olive-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                  title="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}
