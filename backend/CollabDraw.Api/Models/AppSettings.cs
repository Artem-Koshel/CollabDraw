namespace CollabDraw.Api.Models;

public class CollabDrawSettings
{
    public int MaxConnectedUsers { get; set; } = 3;
    public int CanvasWidth { get; set; } = 1200;
    public int CanvasHeight { get; set; } = 800;
    public int SyncIntervalMs { get; set; } = 100;
    public int SnapshotIntervalSeconds { get; set; } = 30;
}
