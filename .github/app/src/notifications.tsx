import { Toaster, toast } from "sonner";

export const notify = {
  success: (message: string) => toast.success(message),
  info: (message: string) => toast.info(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
  dismiss: () => toast.dismiss(),
};

/** Global live announcement and notification surface. No synthetic activity data. */
export function Notifications() {
  return (
    <Toaster
      position="bottom-right"
      closeButton
      visibleToasts={4}
      duration={3500}
      theme="system"
      className="canvas-notification-root"
      toastOptions={{ className: "canvas-toast" }}
    />
  );
}
