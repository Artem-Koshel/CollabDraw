using CollabDraw.Api.Data;
using CollabDraw.Api.Models;
using CollabDraw.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

namespace CollabDraw.Tests;

public class CanvasServiceTests : IDisposable
{
    private readonly ServiceProvider _serviceProvider;
    private readonly IOptions<CollabDrawSettings> _options;

    public CanvasServiceTests()
    {
        var services = new ServiceCollection();
        var dbName = Guid.NewGuid().ToString(); // captured once — all scopes share the same store
        services.AddDbContext<AppDbContext>(opts =>
            opts.UseInMemoryDatabase(dbName));

        _serviceProvider = services.BuildServiceProvider();
        _options = Options.Create(new CollabDrawSettings
        {
            CanvasWidth = 100,
            CanvasHeight = 80,
            MaxConnectedUsers = 3,
            SyncIntervalMs = 100,
            SnapshotIntervalSeconds = 30,
        });
    }

    private CanvasService CreateService() =>
        new(_serviceProvider.GetRequiredService<IServiceScopeFactory>(),
            _options,
            NullLogger<CanvasService>.Instance);

    [Fact]
    public async Task InitializeAsync_NoSnapshot_CreatesWhiteCanvas()
    {
        using var svc = CreateService();

        await svc.InitializeAsync();
        var png = await svc.GetCanvasAsPngAsync();

        Assert.NotEmpty(png);
        using var img = Image.Load<Rgba32>(png);
        Assert.Equal(100, img.Width);
        Assert.Equal(80, img.Height);
        // Top-left pixel should be white
        Assert.Equal(new Rgba32(255, 255, 255, 255), img[0, 0]);
    }

    [Fact]
    public async Task InitializeAsync_WithSnapshot_LoadsSnapshotDimensions()
    {
        // Arrange: seed a snapshot with a known color
        using var snapshotImg = new Image<Rgba32>(100, 80, new Rgba32(200, 100, 50, 255));
        using var ms = new MemoryStream();
        snapshotImg.SaveAsPng(ms);
        var pngBytes = ms.ToArray();

        using (var scope = _serviceProvider.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.CanvasSnapshots.Add(new CanvasSnapshot
            {
                LastSequenceNumber = 5,
                ImageData = pngBytes,
                CreatedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        // Act
        using var svc = CreateService();
        await svc.InitializeAsync();
        var result = await svc.GetCanvasAsPngAsync();

        // Assert: canvas loaded from snapshot
        using var loaded = Image.Load<Rgba32>(result);
        Assert.Equal(100, loaded.Width);
        Assert.Equal(80, loaded.Height);
        Assert.Equal(200, loaded[0, 0].R);
        Assert.Equal(100, loaded[0, 0].G);
        Assert.Equal(50, loaded[0, 0].B);
    }

    [Fact]
    public async Task InitializeAsync_ReplaysEventsAfterSnapshot()
    {
        // Arrange: snapshot at seq 0, then one patch event that paints (0,0) red
        using var snapshotImg = new Image<Rgba32>(100, 80, new Rgba32(255, 255, 255, 255));
        using var snapMs = new MemoryStream();
        snapshotImg.SaveAsPng(snapMs);

        using (var scope = _serviceProvider.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.CanvasSnapshots.Add(new CanvasSnapshot
            {
                LastSequenceNumber = 0,
                ImageData = snapMs.ToArray(),
                CreatedAt = DateTime.UtcNow,
            });
            // PatchEvent gets SequenceNumber=1 (auto-generated), replayed because 1 > 0
            db.PatchEvents.Add(new PatchEvent
            {
                PixelsJson = """[{"X":0,"Y":0,"Color":"#ff0000"}]""",
                AuthorName = "test",
                CreatedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
        }

        // Act
        using var svc = CreateService();
        await svc.InitializeAsync();
        var result = await svc.GetCanvasAsPngAsync();

        // Assert: patch was replayed, top-left should be red
        using var loaded = Image.Load<Rgba32>(result);
        Assert.Equal(255, loaded[0, 0].R);
        Assert.Equal(0, loaded[0, 0].G);
    }

    [Fact]
    public async Task SaveAndApplyAsync_SavesPatchToDatabase()
    {
        using var svc = CreateService();
        await svc.InitializeAsync();

        var dto = new PixelPatchDto([new PixelData(10, 20, "#0000ff")], "Alice");
        var saved = await svc.SaveAndApplyAsync(dto);

        Assert.Equal("Alice", saved.AuthorName);
        Assert.True(saved.SequenceNumber > 0);

        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var count = await db.PatchEvents.CountAsync();
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task SaveAndApplyAsync_AppliesPatchToCanvas()
    {
        using var svc = CreateService();
        await svc.InitializeAsync();

        // Apply a blue pixel at (0,0)
        await svc.SaveAndApplyAsync(new PixelPatchDto([new PixelData(0, 0, "#0000ff")], "Bob"));

        var result = await svc.GetCanvasAsPngAsync();
        using var canvas = Image.Load<Rgba32>(result);
        Assert.Equal(255, canvas[0, 0].B);
    }

    [Fact]
    public async Task SaveAndApplyAsync_EraserPatch_ResetsPixelsToWhite()
    {
        using var svc = CreateService();
        await svc.InitializeAsync();

        // First draw a red pixel at (0,0)
        await svc.SaveAndApplyAsync(new PixelPatchDto([new PixelData(0, 0, "#ff0000")], "Alice"));

        // Verify it's red
        var afterDraw = await svc.GetCanvasAsPngAsync();
        using var canvasAfterDraw = Image.Load<Rgba32>(afterDraw);
        Assert.Equal(255, canvasAfterDraw[0, 0].R);

        // Now erase it (empty color = erase)
        await svc.SaveAndApplyAsync(new PixelPatchDto([new PixelData(0, 0, "")], "Alice"));

        // Pixel should now be white (background)
        var result = await svc.GetCanvasAsPngAsync();
        using var canvas = Image.Load<Rgba32>(result);
        Assert.Equal(new Rgba32(255, 255, 255, 255), canvas[0, 0]);
    }

    [Fact]
    public async Task SaveAndApplyAsync_StoresPixelsJson()
    {
        using var svc = CreateService();
        await svc.InitializeAsync();

        var dto = new PixelPatchDto([new PixelData(5, 5, "#ff0000")], "Alice");
        await svc.SaveAndApplyAsync(dto);

        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var evt = await db.PatchEvents.FirstAsync();
        Assert.Contains("ff0000", evt.PixelsJson);
    }

    [Fact]
    public async Task GetCanvasAsPngAsync_ReturnsPngBytes()
    {
        using var svc = CreateService();
        await svc.InitializeAsync();

        var png = await svc.GetCanvasAsPngAsync();

        // PNG magic bytes: 0x89 0x50 0x4E 0x47
        Assert.Equal(0x89, png[0]);
        Assert.Equal(0x50, png[1]);
        Assert.Equal(0x4E, png[2]);
        Assert.Equal(0x47, png[3]);
    }

    [Fact]
    public async Task CreateSnapshotAsync_SavesSnapshotToDatabase()
    {
        using var svc = CreateService();
        await svc.InitializeAsync();

        await svc.CreateSnapshotAsync();

        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var count = await db.CanvasSnapshots.CountAsync();
        Assert.Equal(1, count);
    }

    [Fact]
    public void GetCanvasSize_ReturnsConfiguredDimensions()
    {
        using var svc = CreateService();

        var (w, h) = svc.GetCanvasSize();

        Assert.Equal(100, w);
        Assert.Equal(80, h);
    }

    public void Dispose() => _serviceProvider.Dispose();
}
