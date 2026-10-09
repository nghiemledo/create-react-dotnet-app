namespace ReactDotnetBoilerplate.Domain.Wrappers
{
    public interface IResult
    {
        List<string> Messages { get; set; }
        bool Status { get; set; }
    }

    public interface IResult<out T> : IResult
    {
        T Data { get; }
    }
}
