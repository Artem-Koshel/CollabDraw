using CollabDraw.Api.Models;

namespace CollabDraw.Api.Services;

public interface ICanvasService
{
    Task InitializeAsync();
    Task<PatchEvent> SaveAndApplyAsync(PixelPatchDto dto);
    Task<byte[]> GetCanvasAsPngAsync();
    Task CreateSnapshotAsync();
    (int Width, int Height) GetCanvasSize();
}

public record PixelData(int X, int Y, string Color); // Color: '#rrggbb' for draw, '' for erase

public record PixelPatchDto(PixelData[] Pixels, string AuthorName);
