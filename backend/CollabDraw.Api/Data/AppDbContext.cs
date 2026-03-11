using CollabDraw.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CollabDraw.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<PatchEvent> PatchEvents => Set<PatchEvent>();
    public DbSet<CanvasSnapshot> CanvasSnapshots => Set<CanvasSnapshot>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<PatchEvent>(e =>
        {
            e.HasKey(x => x.SequenceNumber);
            e.Property(x => x.SequenceNumber).ValueGeneratedOnAdd();
            e.Property(x => x.AuthorName).IsRequired().HasMaxLength(64);
        });

        model.Entity<CanvasSnapshot>(e =>
        {
            e.HasKey(x => x.Id);
        });
    }
}
