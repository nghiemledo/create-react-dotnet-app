namespace ReactDotnetBoilerplate.Application.DataTransferObjects.Requests.Role
{
    public class RoleClaimsDto
    {
        public required string Type { get; set; }
        public required string Value { get; set; }
        public bool Selected { get; set; }
    }
}
