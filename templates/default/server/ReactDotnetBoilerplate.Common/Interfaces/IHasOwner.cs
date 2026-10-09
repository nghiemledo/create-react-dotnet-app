namespace ReactDotnetBoilerplate.Common.Interfaces
{
    public interface IHasOwner<T>
    {
        T OwnerId { set; get; }
    }
}
