using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace ReactDotnetBoilerplate.Domain.Identity
{
    [Table("AppRoles")]
    public class AppRole : IdentityRole<Guid>
    {

        [MaxLength(200)]
        public string? Description { get; set; }
    }
}
