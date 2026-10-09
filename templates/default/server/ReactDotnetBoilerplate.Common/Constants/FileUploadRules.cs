using ReactDotnetBoilerplate.Common.Enums;

namespace ReactDotnetBoilerplate.Common.Constants
{
    public record FileRule(string[] Extensions, long MaxSize, string Folder);

    public static class FileUploadRules
    {
        public static readonly Dictionary<FileCategory, FileRule> Rules = new()
        {
            { FileCategory.Image, new FileRule(new[] { ".jpg", ".jpeg", ".png", ".gif" }, 10 * 1024 * 1024, "uploads/images") },
            { FileCategory.Video, new FileRule(new[] { ".mp4", ".avi", ".mov", ".mkv" }, 1024 * 1024 * 1024, "uploads/videos") },
            { FileCategory.Document, new FileRule(new[] { ".pdf", ".docx", ".xlsx" }, 100 * 1024 * 1024, "uploads/docs") },
            { FileCategory.Audio, new FileRule(new[] { ".mp3", ".wav", ".aac" }, 100 * 1024 * 1024, "uploads/audios") }
        };
    }
}
