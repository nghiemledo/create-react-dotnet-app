namespace ReactDotnetBoilerplate.Application.DataTransferObjects.Requests.Auth
{
    public class OAuthLoginRequest
    {
        public required string Provider { get; set; }
        public required string ProviderId { get; set; }
        public required string Email { get; set; }
        public string? Name { get; set; }
        public string? Image { get; set; }
        public string? IdToken { get; set; }
    }
}
