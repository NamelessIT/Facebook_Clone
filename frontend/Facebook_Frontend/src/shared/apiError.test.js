import { describe, expect, it, vi } from 'vitest';
import { getApiErrorDetails, reportApiError } from './apiError';

describe('getApiErrorDetails', () => {
  it('keeps backend diagnostics and request context', () => {
    const details = getApiErrorDetails({
      config: { method: 'post', url: '/reels' },
      response: {
        status: 400,
        headers: { 'x-correlation-id': 'request-123' },
        data: {
          message: 'Video format is not supported.',
          errorCode: 'REEL_VIDEO_INVALID',
          errors: { videoFile: ['Only MP4 is supported.'] },
        },
      },
    }, 'Upload failed', 'reels.upload');

    expect(details).toMatchObject({
      message: 'Video format is not supported.',
      errorCode: 'REEL_VIDEO_INVALID',
      status: 400,
      correlationId: 'request-123',
      method: 'POST',
      endpoint: '/reels',
      context: 'reels.upload',
      category: 'HTTP',
    });
    expect(details.validationErrors).toEqual(['videoFile: Only MP4 is supported.']);
  });

  it('distinguishes network and timeout failures', () => {
    expect(getApiErrorDetails({ config: { url: '/feed' } }, 'Load failed')).toMatchObject({
      category: 'NETWORK',
      status: null,
    });
    expect(getApiErrorDetails({ code: 'ECONNABORTED' }, 'Load failed')).toMatchObject({
      category: 'TIMEOUT',
      message: 'The request timed out before the server responded.',
    });
  });

  it('logs the normalized details for debugging', () => {
    const group = vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {});
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const groupEnd = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    const details = reportApiError({ response: { status: 503, data: {} } }, 'Service unavailable', 'feed.load');

    expect(details.status).toBe(503);
    expect(group).toHaveBeenCalledOnce();
    expect(errorLog).toHaveBeenCalled();
    expect(groupEnd).toHaveBeenCalledOnce();

    vi.restoreAllMocks();
  });
});
