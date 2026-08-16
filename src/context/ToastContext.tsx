import { createContext, useContext, type ReactNode } from 'react';
import { useToast, type ToastType } from '../hooks/useToast';
import { ToastContainer } from '../components/ToastContainer';

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const { toasts, show, dismiss } = useToast();
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToastContext = () => useContext(ToastContext);
