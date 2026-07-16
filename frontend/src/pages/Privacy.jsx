import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 prose-blog">
      <p className="text-xs text-slate-400 mb-2">Cập nhật: 16/07/2026</p>
      <h1 className="text-3xl font-extrabold mb-6">Chính sách bảo mật</h1>

      <h2>1. Phạm vi</h2>
      <p>
        Chính sách này giải thích cách HoanTienVN thu thập, sử dụng và bảo vệ dữ
        liệu cá nhân khi bạn dùng website/app hoàn tiền.
      </p>

      <h2>2. Dữ liệu chúng tôi thu thập</h2>
      <ul>
        <li>
          <b>Tài khoản:</b> họ tên, email, số điện thoại, mật khẩu (đã hash), mã
          giới thiệu.
        </li>
        <li>
          <b>Thanh toán rút tiền:</b> tên ngân hàng, số tài khoản, chủ tài khoản,
          số MoMo (do bạn cung cấp).
        </li>
        <li>
          <b>Hoạt động:</b> link đã convert, click short link (IP, user-agent), đơn
          hàng / claim, lịch sử ví, thông báo in-app.
        </li>
        <li>
          <b>Liên kết bot (tuỳ chọn):</b> Telegram ID / Zalo ID khi bạn chủ động gắn.
        </li>
        <li>
          <b>Kỹ thuật:</b> cookie phiên, log server, rate-limit theo IP, dữ liệu lỗi
          (nếu bật Sentry).
        </li>
      </ul>

      <h2>3. Mục đích sử dụng</h2>
      <ul>
        <li>Cung cấp dịch vụ cashback, đối soát đơn, hold/rút tiền.</li>
        <li>Bảo mật, chống gian lận, spam đăng ký, lạm dụng API.</li>
        <li>Gửi thông báo giao dịch (web / Telegram nếu bật).</li>
        <li>Cải thiện sản phẩm, thống kê tổng hợp (không bán dữ liệu cá nhân).</li>
      </ul>

      <h2>4. Cơ sở pháp lý / sự đồng ý</h2>
      <p>
        Bằng việc đăng ký và sử dụng Dịch vụ, bạn đồng ý cho phép xử lý dữ liệu cần
        thiết để thực hiện hợp đồng dịch vụ (điều khoản sử dụng) và nghĩa vụ pháp lý
        liên quan.
      </p>

      <h2>5. Chia sẻ dữ liệu</h2>
      <p>Chúng tôi có thể chia sẻ dữ liệu với:</p>
      <ul>
        <li>
          Nhà cung cấp hạ tầng (hosting Render/Vercel, database Supabase, email SMTP
          / Resend) — chỉ để vận hành.
        </li>
        <li>Cơ quan nhà nước khi có yêu cầu hợp pháp.</li>
        <li>
          <b>Không</b> bán danh sách người dùng cho bên thứ ba để quảng cáo ngoài.
        </li>
      </ul>

      <h2>6. Lưu trữ &amp; bảo mật</h2>
      <ul>
        <li>Mật khẩu lưu dạng hash (bcrypt), không lưu plain text.</li>
        <li>Kết nối HTTPS trên production.</li>
        <li>Backup định kỳ (artifact / script) có kiểm soát truy cập.</li>
        <li>
          Không hệ thống nào an toàn 100%; bạn nên dùng mật khẩu mạnh và không chia sẻ
          token.
        </li>
      </ul>

      <h2>7. Thời gian lưu</h2>
      <p>
        Dữ liệu tài khoản và giao dịch được lưu trong thời gian cung cấp dịch vụ và
        thêm một khoảng hợp lý cho đối soát / kế toán / chống gian lận (có thể nhiều
        năm). Bạn có thể yêu cầu xóa tài khoản; một số bản ghi có thể được ẩn danh
        thay vì xóa cứng nếu cần đối soát.
      </p>

      <h2>8. Quyền của bạn</h2>
      <ul>
        <li>Xem / cập nhật hồ sơ trong tài khoản.</li>
        <li>Yêu cầu xuất hoặc xóa dữ liệu (liên hệ hỗ trợ).</li>
        <li>Rút lại đồng ý gắn Telegram/Zalo bằng cách hủy liên kết.</li>
      </ul>

      <h2>9. Cookie</h2>
      <p>
        Chi tiết xem{' '}
        <Link to="/cookies" className="text-shopee font-semibold">
          Chính sách Cookie
        </Link>
        .
      </p>

      <h2>10. Trẻ em</h2>
      <p>
        Dịch vụ không hướng tới người dưới 16 tuổi. Nếu phát hiện tài khoản trẻ em
        không có sự đồng ý phù hợp, chúng tôi có thể xóa.
      </p>

      <h2>11. Liên hệ</h2>
      <p>
        Email: <a href="mailto:hotro@hoantien.vn">hotro@hoantien.vn</a> ·{' '}
        <Link to="/terms" className="text-shopee font-semibold">
          Điều khoản
        </Link>
      </p>
    </div>
  );
}
