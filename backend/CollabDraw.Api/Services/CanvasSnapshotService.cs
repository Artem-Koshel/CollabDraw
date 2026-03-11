using CollabDraw.Api.Models;
using Microsoft.Extensions.Options;

namespace CollabDraw.Api.Services;

public class CanvasSnapshotService(
    ICanvasService canvasService,
    IOptions<CollabDrawSettings> settings,
    ILogger<CanvasSnapshotService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        var interval = TimeSpan.FromSeconds(settings.Value.SnapshotIntervalSeconds);
        logger.LogInformation("Snapshot service started. Interval: {Interval}s", settings.Value.SnapshotIntervalSeconds);

        while (!ct.IsCancellationRequested)
        {
            await Task.Delay(interval, ct);

            try
            {
                await canvasService.CreateSnapshotAsync();
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Failed to create canvas snapshot");
            }
        }
    }
}
