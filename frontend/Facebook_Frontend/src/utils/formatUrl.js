export const getVideoUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `http://localhost:5286${normalized}`;
};

export const getImageUrl = (path, type = 'avatars') => {
  // Trả về Avatar xám mặc định nếu không có đường dẫn
  if (!path) return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
  
  // Nếu đã là link đầy đủ (Google, Facebook...) thì giữ nguyên
  if (path.startsWith('http')) return path;

  // LƯU Ý Ở ĐÂY: Nếu DB chỉ lưu tên file (VD: "abc.png") 
  // thì ta phải tự động ghép thêm thư mục /uploads/... vào
  let finalPath = path;
  if (!path.includes('/')) {
    finalPath = `/uploads/${type}/${path}`;
  } else if (!path.startsWith('/')) {
    finalPath = `/${path}`;
  }

  return `http://localhost:5286${finalPath}`;
};