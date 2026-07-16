import { Link } from 'react-router-dom';

export default function Cookies() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 prose-blog">
      <p className="text-xs text-slate-400 mb-2">Cập nhật: 16/07/2026</p>
      <h1 className="text-3xl font-extrabold mb-6">Chính sách Cookie</h1>

      <h2>1. Cookie là gì?</h2>
      <p>
        Cookie / local storage là tệp nhỏ lưu trên trình duyệt để website nhớ phiên
        đăng nhập, tùy chọn giao diện và chống spam.
      </p>

      <h2>2. Loại chúng tôi dùng</h2>
      <ul>
        <li>
          <b>Bắt buộc:</b> token đăng nhập JWT trong <code>localStorage</code> để duy
          trì phiên.
        </li>
        <li>
          <b>Tùy chọn giao diện:</b> theme sáng/tối (<code>theme</code>).
        </li>
        <li>
          <b>Bảo mật:</b> rate-limit phía server theo IP (không phải cookie trình duyệt).
        </li>
        <li>
          <b>Phân tích / lỗi (tuỳ cấu hình):</b> Sentry nếu admin bật DSN — có thể thu
          thập URL lỗi, trình duyệt.
        </li>
      </ul>

      <h2>3. Cookie bên thứ ba</h2>
      <p>
        Khi bạn click link short → redirect Shopee, Shopee có thể đặt cookie affiliate
        của họ theo chính sách Shopee. HoanTienVN không kiểm soát cookie đó.
      </p>

      <h2>4. Quản lý / xóa</h2>
      <ul>
        <li>Đăng xuất để xóa token phiên trên thiết bị này.</li>
        <li>
          Xóa dữ liệu site trong trình duyệt (Application → Clear site data) sẽ đăng
          xuất và reset theme.
        </li>
        <li>Chặn cookie có thể làm hỏng đăng nhập.</li>
      </ul>

      <h2>5. Cập nhật</h2>
      <p>
        Chính sách có thể thay đổi khi tính năng mới thêm cookie. Xem thêm{' '}
        <Link to="/privacy" className="text-shopee font-semibold">
          Bảo mật
        </Link>{' '}
        và{' '}
        <Link to="/terms" className="text-shopee font-semibold">
          Điều khoản
        </Link>
        .
      </p>
    </div>
  );
}
