const readValidationErrors = (data) => {
  if (Array.isArray(data?.errors)) return data.errors.filter(Boolean).map(String);
  if (!data?.errors || typeof data.errors !== 'object') return [];

  return Object.entries(data.errors).flatMap(([field, messages]) => {
    const values = Array.isArray(messages) ? messages : [messages];
    return values.filter(Boolean).map((message) => `${field}: ${message}`);
  });
};

const getNetworkMessage = (error, fallbackMessage) => {
  if (error?.code === 'ECONNABORTED') return 'The request timed out before the server responded.';
  if (!error?.response) return 'Could not connect to the API. Check the backend service and your network connection.';
  return fallbackMessage;
};

export const getApiErrorDetails = (error, fallbackMessage = 'The request could not be completed.', context) => {
  const response = error?.response;
  const data = response?.data;
  const validationErrors = readValidationErrors(data);
  const message = data?.message || data?.title || getNetworkMessage(error, fallbackMessage) || error?.message;
  const correlationId = data?.correlationId || response?.headers?.['x-correlation-id'] || null;
  const retryAfter = data?.retryAfter || response?.headers?.['retry-after'] || null;
  const method = error?.config?.method?.toUpperCase() || null;
  const endpoint = error?.config?.url || null;
  const status = response?.status || null;

  return {
    message,
    errorCode: data?.errorCode || null,
    status,
    correlationId,
    retryAfter,
    method,
    endpoint,
    context: context || null,
    validationErrors,
    category: !response ? (error?.code === 'ECONNABORTED' ? 'TIMEOUT' : 'NETWORK') : 'HTTP',
    occurredAt: new Date().toISOString(),
  };
};

export const formatApiErrorSummary = (details) => {
  const diagnostics = [
    details.status ? `HTTP ${details.status}` : null,
    details.errorCode,
    details.correlationId ? `ID ${details.correlationId}` : null,
  ].filter(Boolean);

  return diagnostics.length > 0
    ? `${details.message} (${diagnostics.join(' | ')})`
    : details.message;
};

export const reportApiError = (error, fallbackMessage, context) => {
  const details = getApiErrorDetails(error, fallbackMessage, context);
  console.groupCollapsed(
    `[API_ERROR] ${details.method || 'REQUEST'} ${details.endpoint || 'unknown'} - ${details.errorCode || details.status || details.category}`,
  );
  console.error('Summary:', details.message);
  console.error('Diagnostics:', details);
  if (error) console.error('Original error:', error);
  console.groupEnd();
  return details;
};
