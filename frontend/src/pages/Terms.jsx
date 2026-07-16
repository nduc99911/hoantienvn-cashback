import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 prose-blog">
      <p className="text-xs text-slate-400 mb-2">Cập nhật: 16/07/2026</p>
      <h1 className="text-3xl font-extrabold mb-6">Điều khoản sử dụng</h1>

      <h2>1. Giới thiệu &amp; chấp nhận</h2>
      <p>
        Bằng việc truy cập hoặc sử dụng website/app HoanTienVN (&quot;Dịch vụ&quot;), bạn
        đồng ý với Điều khoản này và{' '}
        <Link to="/privacy" className="text-shopee font-semibold">
          Chính sách bảo mật
        </Link>
        . Nếu không đồng ý, vui lòng ngừng sử dụng.
      </p>

      <h2>2. Mô tả dịch vụ</h2>
      <p>
        HoanTienVN cung cấp công cụ tạo link theo dõi affiliate Shopee (
        <code>an_redir</code> + <code>sub_id</code>), ghi nhận đơn qua import báo
        cáo Affiliate / khai báo, chia sẻ một phần hoa hồng affiliate dưới dạng
        hoàn tiền (cashback), ví điện tử nội bộ, giới thiệu F1/F2 và rút tiền.
        Dịch vụ <b>không phải</b> Shopee và không phải tổ chức tín dụng.
      </p>

      <h2>3. Tài khoản</h2>
      <ul>
        <li>Bạn phải cung cấp thông tin chính xác khi đăng ký.</li>
        <li>Bạn chịu trách nhiệm bảo mật mật khẩu và mọi hoạt động trên tài khoản.</li>
        <li>
          Chúng tôi có quyền tạm khóa / chấm dứt tài khoản nếu phát hiện gian lận,
          spam, lạm dụng hệ thống giới thiệu hoặc vi phạm điều khoản Shopee Affiliate.
        </li>
      </ul>

      <h2>4. Điều kiện nhận hoàn tiền</h2>
      <ul>
        <li>
          Đơn phải phát sinh qua link hoàn tiền của hệ thống và được ghi nhận trên
          tài khoản Affiliate master liên kết với nền tảng.
        </li>
        <li>Đơn hủy, trả hàng, chargeback hoặc không hợp lệ sẽ không được hoàn / bị thu hồi.</li>
        <li>
          Admin có quyền từ chối claim/import không khớp đối soát, có dấu hiệu gian
          lận hoặc thiếu click tracking.
        </li>
        <li>
          Tỷ lệ chia sẻ hoa hồng (ví dụ ~70%), hold (mặc định 7 ngày) và hạn mức rút
          có thể thay đổi theo cấu hình Admin.
        </li>
      </ul>

      <h2>5. Hold &amp; rút tiền</h2>
      <p>
        Sau khi đơn được duyệt, số tiền có thể bị hold trước khi vào số dư khả dụng.
        Rút tiền tối thiểu theo cấu hình; xử lý thủ công qua ngân hàng / MoMo trong
        thời gian hợp lý (thường 1–3 ngày làm việc, không cam kết cố định).
      </p>

      <h2>6. Chương trình giới thiệu F1/F2</h2>
      <p>
        Hoa hồng giới thiệu chỉ tính trên cashback hợp lệ của tuyến dưới sau khi tiền
        vào ví khả dụng. Tỷ lệ F1/F2 có thể điều chỉnh. Cấm spam, mua ảo, hoặc tạo
        tài khoản giả để trục lợi.
      </p>

      <h2>7. Hành vi bị cấm</h2>
      <ul>
        <li>Click ảo, bot, self-referral gian lận, cookie stuffing.</li>
        <li>Can thiệp hệ thống, reverse engineering trái phép, tấn công DDoS.</li>
        <li>Sử dụng Dịch vụ cho mục đích bất hợp pháp theo pháp luật Việt Nam.</li>
      </ul>

      <h2>8. Sở hữu trí tuệ</h2>
      <p>
        Logo, giao diện, mã nguồn và nội dung HoanTienVN thuộc quyền của chủ sở hữu
        Dịch vụ (trừ thương hiệu/sản phẩm bên thứ ba như Shopee).
      </p>

      <h2>9. Giới hạn trách nhiệm</h2>
      <p>
        Dịch vụ cung cấp &quot;nguyên trạng&quot;. Chúng tôi không chịu trách nhiệm cho thiệt
        hại gián tiếp, mất dữ liệu, gián đoạn do Shopee, nhà mạng, hosting hoặc hành
        vi của người dùng. Tổng trách nhiệm (nếu có) không vượt quá số tiền cashback
        đã ghi nhận hợp lệ chưa rút của bạn trong 30 ngày gần nhất.
      </p>

      <h2>10. Thay đổi điều khoản</h2>
      <p>
        Chúng tôi có thể cập nhật Điều khoản; phiên bản mới có hiệu lực khi đăng tải.
        Việc tiếp tục sử dụng đồng nghĩa chấp nhận thay đổi.
      </p>

      <h2>11. Luật áp dụng</h2>
      <p>
        Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Tranh chấp ưu tiên
        thương lượng; nếu không được, giải quyết tại tòa án có thẩm quyền tại Việt Nam.
      </p>

      <h2>12. Liên hệ</h2>
      <p>
        Email hỗ trợ: <a href="mailto:hotro@hoantien.vn">hotro@hoantien.vn</a> (hoặc
        cấu hình trong Admin). Xem thêm{' '}
        <Link to="/privacy" className="text-shopee font-semibold">
          Bảo mật
        </Link>{' '}
        ·{' '}
        <Link to="/cookies" className="text-shopee font-semibold">
          Cookie
        </Link>
        .
      </p>
    </div>
  );
}
