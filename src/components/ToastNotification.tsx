import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { notifications, removeNotification } = useApp();

  useEffect(() => {
    if (!notifications.length) return;
    const timer = setTimeout(() => removeNotification(notifications[0].id), 6000);
    return () => clearTimeout(timer);
  }, [notifications, removeNotification]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[min(384px,calc(100vw-2rem))] pointer-events-none">
      {notifications.map((notif) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />,
          info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
          error: <XCircle className="w-5 h-5 text-rose-500 shrink-0" />,
        };

        const borderColors = {
          success: 'border-emerald-500/30 bg-emerald-50/90 dark:bg-emerald-950/80',
          warning: 'border-amber-500/30 bg-amber-50/90 dark:bg-amber-950/80',
          info: 'border-blue-500/30 bg-blue-50/90 dark:bg-blue-950/80',
          error: 'border-rose-500/30 bg-rose-50/90 dark:bg-rose-950/80',
        };

        return (
          <div
            role="status"
            key={notif.id}
            className={`pointer-events-auto border rounded-xl p-3.5 shadow-lg backdrop-blur-md flex items-start gap-3 transition-all transform translate-y-0 duration-200 text-slate-800 dark:text-slate-100 ${borderColors[notif.type]}`}
          >
            {icons[notif.type]}
            <div className="flex-1 min-w-0">
              <h5 className="font-bold text-xs leading-tight">{notif.title}</h5>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                {notif.message}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notif.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
