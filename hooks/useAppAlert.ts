import { useState, useCallback } from 'react';

type AlertType = 'success' | 'error';

export function useAppAlert() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AlertType>('success');

  const showAlert = useCallback((msg: string, alertType: AlertType = 'success') => {
    setMessage(msg);
    setType(alertType);
    setVisible(true);
  }, []);

  const hideAlert = useCallback(() => setVisible(false), []);

  return { visible, message, type, showAlert, hideAlert };
}
