namespace ReactDotnetBoilerplate.Domain.Base
{
    public abstract class NonAuditableEntity<TId> : INonAuditableEntity<TId>
    {
        public TId Id { get; set; } = default!;
    }
}
