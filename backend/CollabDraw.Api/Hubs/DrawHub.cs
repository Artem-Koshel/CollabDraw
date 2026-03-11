using CollabDraw.Api.Models;
using CollabDraw.Api.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using System.Collections.Concurrent;

namespace CollabDraw.Api.Hubs;

public class DrawHub(
    ICanvasService canvasService,
    IOptions<CollabDrawSettings> settings,
    ILogger<DrawHub> logger) : Hub
{
    private static readonly ConcurrentDictionary<string, string> _connected = new();

    public async Task<JoinResult> Join(string userName)
    {
        var cfg = settings.Value;

        if (_connected.Count >= cfg.MaxConnectedUsers)
        {
            return new JoinResult
            {
                Success = false,
                Reason = $"Canvas is full ({cfg.MaxConnectedUsers} users max). Try again later."
            };
        }

        _connected[Context.ConnectionId] = userName;
        logger.LogInformation("User '{Name}' joined. Active: {Count}/{Max}", userName, _connected.Count, cfg.MaxConnectedUsers);

        var canvasPng = await canvasService.GetCanvasAsPngAsync();
        var (w, h) = canvasService.GetCanvasSize();

        return new JoinResult
        {
            Success = true,
            CanvasData = Convert.ToBase64String(canvasPng),
            CanvasWidth = w,
            CanvasHeight = h,
            SyncIntervalMs = cfg.SyncIntervalMs
        };
    }

    public async Task SendPixelPatch(PixelPatchDto dto)
    {
        if (!_connected.ContainsKey(Context.ConnectionId))
            return;

        // Broadcast immediately — does not block while DB write is in flight
        _ = Clients.All.SendAsync("ReceivePixelPatch", dto);

        await canvasService.SaveAndApplyAsync(dto);
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        if (_connected.TryRemove(Context.ConnectionId, out var name))
            logger.LogInformation("User '{Name}' disconnected. Active: {Count}", name, _connected.Count);

        return base.OnDisconnectedAsync(exception);
    }
}

public class JoinResult
{
    public bool Success { get; init; }
    public string? Reason { get; init; }
    public string? CanvasData { get; init; }
    public int? CanvasWidth { get; init; }
    public int? CanvasHeight { get; init; }
    public int? SyncIntervalMs { get; init; }
}
