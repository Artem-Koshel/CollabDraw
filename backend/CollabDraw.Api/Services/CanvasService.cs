using CollabDraw.Api.Data;
using CollabDraw.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using System.Text.Json;

namespace CollabDraw.Api.Services;

public class CanvasService : ICanvasService, IDisposable
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly CollabDrawSettings _settings;
    private readonly ILogger<CanvasService> _logger;
    private readonly SemaphoreSlim _lock = new(1, 1);

    private Image<Rgba32> _canvas = null!;

    public CanvasService(IServiceScopeFactory scopeFactory, IOptions<CollabDrawSettings> settings, ILogger<CanvasService> logger)
    {
        _scopeFactory = scopeFactory;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task InitializeAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var snapshot = await db.CanvasSnapshots
            .OrderByDescending(s => s.LastSequenceNumber)
            .FirstOrDefaultAsync();

        long replayFrom = 0;

        if (snapshot != null)
        {
            _canvas = Image.Load<Rgba32>(snapshot.ImageData);
            replayFrom = snapshot.LastSequenceNumber;
            _logger.LogInformation("Loaded snapshot at seq#{Seq}", replayFrom);
        }
        else
        {
            _canvas = new Image<Rgba32>(_settings.CanvasWidth, _settings.CanvasHeight, new Rgba32(255, 255, 255, 255));
        }

        var events = await db.PatchEvents
            .Where(e => e.SequenceNumber > replayFrom)
            .OrderBy(e => e.SequenceNumber)
            .ToListAsync();

        foreach (var e in events)
        {
            var pixels = JsonSerializer.Deserialize<PixelData[]>(e.PixelsJson) ?? [];
            ApplyPixelsToCanvas(pixels);
        }

        _logger.LogInformation("Canvas ready. Replayed {Count} events after snapshot.", events.Count);
    }

    public async Task<PatchEvent> SaveAndApplyAsync(PixelPatchDto dto)
    {
        var pixelsJson = JsonSerializer.Serialize(dto.Pixels);

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var patchEvent = new PatchEvent
        {
            PixelsJson = pixelsJson,
            AuthorName = dto.AuthorName,
            CreatedAt = DateTime.UtcNow
        };

        db.PatchEvents.Add(patchEvent);
        await db.SaveChangesAsync();

        await _lock.WaitAsync();
        try
        {
            ApplyPixelsToCanvas(dto.Pixels);
        }
        finally
        {
            _lock.Release();
        }

        return patchEvent;
    }

    public async Task<byte[]> GetCanvasAsPngAsync()
    {
        await _lock.WaitAsync();
        try
        {
            return EncodeToPng(_canvas);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task CreateSnapshotAsync()
    {
        byte[] pngBytes;

        await _lock.WaitAsync();
        try
        {
            pngBytes = EncodeToPng(_canvas);
        }
        finally
        {
            _lock.Release();
        }

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var lastSeq = await db.PatchEvents
            .OrderByDescending(e => e.SequenceNumber)
            .Select(e => e.SequenceNumber)
            .FirstOrDefaultAsync();

        db.CanvasSnapshots.Add(new CanvasSnapshot
        {
            LastSequenceNumber = lastSeq,
            ImageData = pngBytes,
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync();
        _logger.LogInformation("Snapshot created at seq#{Seq}", lastSeq);
    }

    public (int Width, int Height) GetCanvasSize() => (_settings.CanvasWidth, _settings.CanvasHeight);

    private void ApplyPixelsToCanvas(PixelData[] pixels)
    {
        var white = new Rgba32(255, 255, 255, 255);

        _canvas.ProcessPixelRows(accessor =>
        {
            foreach (var p in pixels)
            {
                if (p.X < 0 || p.X >= _canvas.Width || p.Y < 0 || p.Y >= _canvas.Height)
                    continue;

                var row = accessor.GetRowSpan(p.Y);

                if (string.IsNullOrEmpty(p.Color))
                {
                    row[p.X] = white;
                }
                else
                {
                    var r = Convert.ToByte(p.Color.Substring(1, 2), 16);
                    var g = Convert.ToByte(p.Color.Substring(3, 2), 16);
                    var b = Convert.ToByte(p.Color.Substring(5, 2), 16);
                    row[p.X] = new Rgba32(r, g, b, 255);
                }
            }
        });
    }

    private static byte[] EncodeToPng(Image<Rgba32> image)
    {
        using var ms = new MemoryStream();
        image.SaveAsPng(ms);
        return ms.ToArray();
    }

    public void Dispose()
    {
        _canvas?.Dispose();
        _lock.Dispose();
    }
}
