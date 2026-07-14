namespace FacebookClone.Domain.Interfaces;

/// <summary>
/// Transaction boundary for multi-write application flows. Runs the action inside
/// a single DB transaction: commits on success, rolls back on any exception.
/// Backed by the same scoped DbContext the repositories use, so their
/// SaveChanges calls participate in the transaction.
/// </summary>
public interface IUnitOfWork
{
    Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken ct = default);

    Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> action, CancellationToken ct = default);
}
