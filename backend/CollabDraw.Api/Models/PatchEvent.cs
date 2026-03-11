namespace CollabDraw.Api.Models;

public class PatchEvent
{
    public long SequenceNumber { get; set; }
    public string PixelsJson { get; set; } = "[]"; // JSON array of {X,Y,Color} objects
    public string AuthorName { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}
