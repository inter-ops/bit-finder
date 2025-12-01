import { useEffect } from 'preact/hooks';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export function Notification({ message, type, onClose }: NotificationProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div class={`notification notification-${type}`}>
      <span>{message}</span>
      <button class="notification-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
}