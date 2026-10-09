using System.ComponentModel;

namespace ReactDotnetBoilerplate.Common.Enums
{
    public enum FileCategory
    {
        [Description("Image")]
        Image = 0,
        [Description("Document")]
        Document = 1,
        [Description("Video")]
        Video = 2,
        [Description("Audio")]
        Audio = 3,
        [Description("Other")]
        Other = 4
    }
}
