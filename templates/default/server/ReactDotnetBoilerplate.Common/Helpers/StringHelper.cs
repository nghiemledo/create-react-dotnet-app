using System.Globalization;
using System.Text;

namespace ReactDotnetBoilerplate.Common.Helpers
{
    public static class StringHelper
    {
        public static string RemoveVietnameseSigns(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return string.Empty;

            string normalized = text.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();

            foreach (var c in normalized)
            {
                var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                    sb.Append(c);
            }

            string result = sb.ToString().Normalize(NormalizationForm.FormC);
            result = result.Replace("đ", "d").Replace("Đ", "D");
            return result.Trim().ToLowerInvariant();
        }
    }
}
