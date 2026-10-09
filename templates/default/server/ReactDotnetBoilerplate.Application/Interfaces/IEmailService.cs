namespace ReactDotnetBoilerplate.Application.Interfaces
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string htmlMessage);
        Task SendOtpEmailAsync(string toEmail, string userName, string otp);
    }
}
