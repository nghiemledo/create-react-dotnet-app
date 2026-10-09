using ReactDotnetBoilerplate.Common.ConfigOptions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace ReactDotnetBoilerplate.Infrastructure.Services.Token
{
    public interface ITokenService
    {
        string GenerateAccessToken(IEnumerable<Claim> claims);
        string GenerateRefreshToken();
        ClaimsPrincipal GetPrincipalFromExpiredToken(string token);


        string GenerateToken(Guid userId, string email, string lastName, string firstName, string avatar, string role, string roleId);
    }
    public class TokenService : ITokenService
    {
        private readonly JwtTokenSettings _jwtTokenSettings;
        private readonly IConfiguration _config;
        public TokenService(IOptions<JwtTokenSettings> jwtTokenSettings, IConfiguration config)
        {
            _jwtTokenSettings = jwtTokenSettings.Value;
            _config = config;

        }
        public string GenerateAccessToken(IEnumerable<Claim> claims)
        {
            var secretKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtTokenSettings.Key));
            var signinCredentials = new SigningCredentials(secretKey, SecurityAlgorithms.HmacSha256);

            var tokeOptions = new JwtSecurityToken(
                issuer: _jwtTokenSettings.Issuer,
                audience: _jwtTokenSettings.Issuer,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(30), // Reduced to 30 minutes
                signingCredentials: signinCredentials
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(tokeOptions);
            return tokenString;
        }

        public string GenerateRefreshToken()
        {
            var randomNumber = new byte[32];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomNumber);
                return Convert.ToBase64String(randomNumber);
            }
        }

        public ClaimsPrincipal GetPrincipalFromExpiredToken(string token)
        {
            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateAudience = false, //you might want to validate the audience and issuer depending on your use case
                ValidateIssuer = false,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtTokenSettings.Key)),
                ValidateLifetime = false //here we are saying that we don't care about the token's expiration date
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            SecurityToken securityToken;
            var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out securityToken);
            var jwtSecurityToken = securityToken as JwtSecurityToken;
            if (jwtSecurityToken == null || !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
                throw new SecurityTokenException("Invalid token");

            return principal;
        }

        //Bổ sung 21h 01/09/2025
        public string GenerateToken(Guid userId, string email, string lastName, string firstName, string avatar, string role, string roleId)
        {
            //    var claims = new[]
            //    {
            //    new Claim(JwtRegisteredClaimNames.Sub, email),
            //    new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            //   // new Claim("id", userId.ToString()),
            //    new Claim(ClaimTypes.Role, role),
            //    new Claim("roleId", roleId),
            //    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            //};

            var claims = new List<Claim>
        {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                new Claim("id", userId.ToString()),
                new Claim("lastName", lastName),
                new Claim("firstName", firstName),
                new Claim("avatar", avatar),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Role, role),
                new Claim("roleId", roleId),
        };


            var jwtKey = _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured");
            var jwtIssuer = _config["Jwt:Issuer"] ?? throw new InvalidOperationException("Jwt:Issuer is not configured");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: null,
                claims: claims,
                expires: DateTime.UtcNow.AddDays(1),
                signingCredentials: creds
            );
            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        /*
         public string GenerateToken(Guid userId, string email, string role, string roleId)
{
    var claims = new List<Claim>
    {
        new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
        new Claim(ClaimTypes.Email, email),
        new Claim(ClaimTypes.Role, role),
        new Claim("roleId", roleId)
    };

    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Key));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
        issuer: _jwtSettings.Issuer,
        audience: _jwtSettings.Audience,
        claims: claims,
        expires: DateTime.UtcNow.AddHours(3),
        signingCredentials: creds
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
}

         */
    }
}
