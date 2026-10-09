namespace ReactDotnetBoilerplate.Application.DataTransferObjects.Responses.Auth
{
    public class AuthResponse
    {
        public string? Token { get; set; }
        public string? RefreshToken { get; set; }
        public UserResponse? User { get; set; }
    }
}
