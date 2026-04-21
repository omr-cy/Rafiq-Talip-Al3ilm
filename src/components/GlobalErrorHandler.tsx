import { useEffect } from "react";
import { useNotification } from "./NotificationProvider";

export function GlobalErrorHandler() {
  const { addNotification } = useNotification();

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      if (error && error.message && (error.message.includes("مساحة التخزين") || error.message.includes("حدث خطأ أثناء حفظ"))) {
        addNotification({
          title: "تنبيه",
          message: error.message,
          type: "warning",
        });
        event.preventDefault(); // Prevent default console error if handled
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, [addNotification]);

  return null;
}
