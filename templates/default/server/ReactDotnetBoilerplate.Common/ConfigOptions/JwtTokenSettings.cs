namespace ReactDotnetBoilerplate.Common.ConfigOptions
{
    public class JwtTokenSettings
    {
        public string Key { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public int ExpireInHours { get; set; }
    }
}
