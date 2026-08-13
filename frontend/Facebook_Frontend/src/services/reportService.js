import axiosClient from './axiosClient';

const reportService = {
  create: (targetType, targetId, reason, details = '', evidence = []) => {
    const form = new FormData();
    form.append('targetType', targetType);
    form.append('targetId', targetId);
    form.append('reason', reason);
    form.append('details', details);
    evidence.forEach((file) => form.append('evidence', file));
    return axiosClient.post('/reports/with-evidence', form);
  },
};

export default reportService;
