using FacebookClone.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FacebookClone.Infrastructure;

public class UnitOfWork(AppDbContext db) : IUnitOfWork
{
    public async Task ExecuteInTransactionAsync(Func<Task> action, CancellationToken ct = default)
    {
        // If a transaction is already open (nested call), just run the action
        // so we don't try to start a second one on the same connection.
        if (db.Database.CurrentTransaction is not null)
        {
            await action();
            return;
        }

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            await action();
            await tx.CommitAsync(ct);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> action, CancellationToken ct = default)
    {
        if (db.Database.CurrentTransaction is not null)
            return await action();

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            var result = await action();
            await tx.CommitAsync(ct);
            return result;
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }
}
