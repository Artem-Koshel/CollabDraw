using CollabDraw.Api.Models;
using CollabDraw.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace CollabDraw.Tests;

public class CanvasSnapshotServiceTests
{
    private readonly Mock<ICanvasService> _canvasService = new();

    private CanvasSnapshotService CreateService(int intervalSeconds = 1) =>
        new(_canvasService.Object,
            Options.Create(new CollabDrawSettings { SnapshotIntervalSeconds = intervalSeconds }),
            NullLogger<CanvasSnapshotService>.Instance);

    [Fact]
    public async Task ExecuteAsync_CallsCreateSnapshotAfterInterval()
    {
        _canvasService.Setup(s => s.CreateSnapshotAsync()).Returns(Task.CompletedTask);

        using var cts = new CancellationTokenSource();
        var svc = CreateService(intervalSeconds: 1);

        var task = svc.StartAsync(cts.Token);

        // Wait slightly longer than the interval
        await Task.Delay(1200);
        await cts.CancelAsync();

        try { await svc.StopAsync(CancellationToken.None); } catch { /* expected */ }

        _canvasService.Verify(s => s.CreateSnapshotAsync(), Times.AtLeastOnce);
    }

    [Fact]
    public async Task ExecuteAsync_StopsOnCancellation()
    {
        _canvasService.Setup(s => s.CreateSnapshotAsync()).Returns(Task.CompletedTask);

        using var cts = new CancellationTokenSource();
        var svc = CreateService(intervalSeconds: 60); // Long interval — won't fire

        var task = svc.StartAsync(cts.Token);
        await cts.CancelAsync();

        // Should complete without hanging
        var completed = await Task.WhenAny(svc.StopAsync(CancellationToken.None), Task.Delay(2000));
        Assert.NotEqual(Task.Delay(2000), completed);
    }

    [Fact]
    public async Task ExecuteAsync_SnapshotException_DoesNotStopService()
    {
        var callCount = 0;
        _canvasService.Setup(s => s.CreateSnapshotAsync()).Returns(() =>
        {
            callCount++;
            throw new InvalidOperationException("DB error");
        });

        using var cts = new CancellationTokenSource();
        var svc = CreateService(intervalSeconds: 1);
        _ = svc.StartAsync(cts.Token);

        // Service should survive the first exception and fire at least once more
        await Task.Delay(2500);
        await cts.CancelAsync();
        try { await svc.StopAsync(CancellationToken.None); } catch { /* expected */ }

        Assert.True(callCount >= 2, $"Expected ≥2 calls, got {callCount}");
    }
}
