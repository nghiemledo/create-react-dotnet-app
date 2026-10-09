namespace ReactDotnetBoilerplate.Application.DataTransferObjects.Responses.Auth
{
    public class ManagerResponse
    {
        public string Id { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public List<string> Roles { get; set; } = new List<string>();
        public bool IsActive { get; set; }
        public List<string> Permissions { get; set; } = new List<string>();
    }
}
