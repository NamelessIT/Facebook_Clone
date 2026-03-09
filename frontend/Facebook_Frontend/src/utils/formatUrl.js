// Hàm này giúp ghép URL của Backend vào đường dẫn ảnh
export const getImageUrl = (path, fallbackName = "User") => {
  // Nếu dùng mạng bị chặn placeholder, đổi sang dùng ui-avatars (Tạo ảnh có chữ cái đầu của tên)
  if (!path) return `https://ui-avatars.com/api/?name=${fallbackName}&background=e4e6eb&color=050505`;
  
  // Nếu path đã là một URL hoàn chỉnh (có http) thì giữ nguyên
  if (path.startsWith('http')) return path;

  // Nếu trong Database của bạn path thiếu chữ /uploads/... (chỉ có tên file), bạn cần điều chỉnh ở đây.
  // Nhưng theo code Backend lúc trước, nó đã trả về dạng "/uploads/avatars/..." rồi.
  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `http://localhost:5286${formattedPath}`;
};