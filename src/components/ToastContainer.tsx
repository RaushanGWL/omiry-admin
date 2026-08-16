import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import type { ToastItem } from '../hooks/useToast';
import './Toast.css';

interface ToastProps {
  toasts: ToastItem[];
  dismiss: (id: number) => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

export const ToastContainer = ({ toasts, dismiss }: ToastProps) => {
  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <Icon size={18} className="toast-icon" />
            <span className="toast-msg">{t.message}</span>
            <button className="toast-close" onClick={() => dismiss(t.id)}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
