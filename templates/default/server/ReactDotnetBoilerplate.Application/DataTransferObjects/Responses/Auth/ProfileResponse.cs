namespace ReactDotnetBoilerplate.Application.DataTransferObjects.Responses.Auth
{
    public class ProfileResponse
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Avatar { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
    }
}
