using ReactDotnetBoilerplate.Application.Interfaces;
using ReactDotnetBoilerplate.Common.ConfigOptions;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Options;
using MimeKit;

namespace ReactDotnetBoilerplate.Infrastructure.Services.Email
{
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;

        public EmailService(IOptions<EmailSettings> emailSettings)
        {
            _emailSettings = emailSettings.Value;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string htmlMessage)
        {
            var email = new MimeMessage();
            email.From.Add(new MailboxAddress(_emailSettings.DisplayName, _emailSettings.SmtpUser));
            email.To.Add(MailboxAddress.Parse(toEmail));
            email.Subject = subject;

            var builder = new BodyBuilder
            {
                HtmlBody = htmlMessage
            };
            email.Body = builder.ToMessageBody();

            using var smtp = new SmtpClient();
            try
            {
                await smtp.ConnectAsync(_emailSettings.SmtpHost, _emailSettings.SmtpPort, MailKit.Security.SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(_emailSettings.SmtpUser, _emailSettings.SmtpPass);
                await smtp.SendAsync(email);
            }
            finally
            {
                await smtp.DisconnectAsync(true);
                smtp.Dispose();
            }
        }

        public async Task SendOtpEmailAsync(string toEmail, string userName, string otp)
        {
            const string subject = "Mã xác nhận quên mật khẩu";
            
            string htmlMessage = $@"<!DOCTYPE html>
<html lang=""vi"">
<head>
    <meta charset=""UTF-8"">
    <style>
        body {{
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #1f2937;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            text-align: center;
        }}
        .logo {{
            font-size: 20px;
            font-weight: 800;
            color: #1d4ed8;
            margin-bottom: 25px;
            text-align: center;
            display: block;
        }}
        .title {{
            color: #1e3a8a;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 20px;
        }}
        .text-content {{
            font-size: 16px;
            line-height: 1.6;
            color: #2b313a;
            margin-bottom: 10px;
        }}
        .highlight-email {{
            color: #2563eb;
            font-weight: 600;
        }}
        .otp-container {{
            margin: 30px 0;
        }}
        .otp-box {{
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
            color: #1d4ed8;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 8px;
            padding: 15px 40px;
            border-radius: 8px;
            display: inline-block;
        }}
        .duration {{
            font-size: 14px;
            color: #4b5563;
            margin-bottom: 30px;
        }}
        .duration span {{
            font-weight: 700;
            color: #1f2937;
        }}
        .note-box {{
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 20px;
            text-align: left;
            font-size: 13px;
            color: #1e3a8a;
        }}
        .note-title {{
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 10px;
        }}
        .note-list {{
            margin: 0;
            padding-left: 20px;
        }}
        .note-list li {{
            margin-bottom: 8px;
        }}
        .note-list li:last-child {{
            margin-bottom: 0;
        }}
        .divider {{
            border-top: 1px solid #e5e7eb;
            border-bottom: none;
            margin: 30px 0;
        }}
        .footer {{
            font-size: 11px;
            color: #6b7280;
            line-height: 1.6;
        }}
    </style>
</head>
<body style=""margin: 0; padding: 0; background-color: #f3f4f6;"">
    <table width=""100%"" border=""0"" cellpadding=""0"" cellspacing=""0"" style=""background-color: #f3f4f6;"">
        <tr>
            <td align=""center"" style=""padding: 40px 10px;"">
                
                <div class=""container"" style=""max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; text-align: center;"">
                    
                    <div class=""logo"" style=""text-align: center; font-size: 20px; font-weight: 800; color: #1d4ed8; margin-bottom: 25px;"">
                        Hệ thống quản lý đào tạo
                    </div>

                    <div class=""title"">Đặt lại mật khẩu của bạn</div>

                    <div class=""text-content"">Xin chào <strong>{userName}</strong>,</div>
                    <div class=""text-content"">
                        Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản<br>
                        <span class=""highlight-email"" style=""text-decoration: underline"">{toEmail}</span>.<br>
                        Dưới đây là mã xác nhận để tiếp tục:
                    </div>

                    <div class=""otp-container"">
                        <div class=""otp-box"">{otp}</div>
                    </div>

                    <div class=""duration"">
                        Mã có hiệu lực trong <span>5 phút</span>.<br>
                        Sau khi nhập mã, bạn có thể đặt lại mật khẩu mới và đăng nhập lại vào hệ thống.
                    </div>

                    <div class=""note-box"">
                        <div class=""note-title"">Lưu ý:</div>
                        <ul class=""note-list"">
                            <li>Không chia sẻ mã này cho bất kỳ ai.</li>
                            <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</li>
                        </ul>
                    </div>

                    <div class=""text-content"" style=""margin-top: 25px; font-weight: 500;"">
                        Cảm ơn bạn đã tin tưởng hệ thống.
                    </div>

                    <hr class=""divider"">

                    <div class=""footer"">
                        <div style=""margin-top: 5px;"">&copy; {DateTime.Now.Year}. Mọi quyền được bảo lưu.</div>
                    </div>
                </div>

            </td>
        </tr>
    </table>
</body>
</html>";
            await SendEmailAsync(toEmail, subject, htmlMessage);
        }
    }
}