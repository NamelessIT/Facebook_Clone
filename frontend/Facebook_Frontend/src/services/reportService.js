import axiosClient from './axiosClient';

const reportService = {
  create: (targetType, targetId, reason, details = '') =>
    axiosClient.post('/reports', { targetType, targetId, reason, details }),
};

export default reportService;
