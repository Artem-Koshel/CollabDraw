namespace CollabDraw.Api.Models;

public class CanvasSnapshot
{
    public int Id { get; set; }
    public long LastSequenceNumber { get; set; }
    public byte[] ImageData { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}
