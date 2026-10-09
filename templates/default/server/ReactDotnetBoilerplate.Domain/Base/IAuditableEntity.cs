namespace ReactDotnetBoilerplate.Domain.Base
{
    public interface IAuditableEntity<TId> : IAuditableEntity, IEntity<TId>
    {
    }

    public interface IAuditableEntity : IEntity
    {
        DateTimeOffset CreatedAt { get; set; }

        DateTimeOffset? UpdatedAt { get; set; }

        //bool IsDeleted { get; set; }
    }
}
