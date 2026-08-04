import hotToast from 'react-hot-toast';
import { reportApiError } from './apiError';

const appToast = Object.assign(
  (...args) => hotToast(...args),
  hotToast,
  {
    apiError(error, fallbackMessage, options = {}) {
      const details = reportApiError(error, fallbackMessage, options.context);

      return hotToast.error(details.message, {
        duration: 8000,
        ...options,
        diagnostics: details,
      });
    },
  },
);

export default appToast;
