import axiosClient from './axiosClient';

const localizationService = {
  getBundle: (locale) => axiosClient.get('/localization', { params: locale ? { locale } : {} }),
};

export default localizationService;
