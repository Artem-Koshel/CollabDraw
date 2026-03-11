using CollabDraw.Api.Hubs;
using CollabDraw.Api.Models;
using CollabDraw.Api.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using System.Reflection;

namespace CollabDraw.Tests;

public class DrawHubTests : IDisposable
{
    private readonly Mock<ICanvasService> _canvasService;
    private readonly IOptions<CollabDrawSettings> _options;
    private readonly DrawHub _hub;
    private readonly Mock<HubCallerContext> _context;
    private readonly Mock<IHubCallerClients> _clients;
    private readonly Mock<IClientProxy> _allClients;

    public DrawHubTests()
    {
        _canvasService = new Mock<ICanvasService>();
        _options = Options.Create(new CollabDrawSettings { MaxConnectedUsers = 2 });

        _hub = new DrawHub(_canvasService.Object, _options, NullLogger<DrawHub>.Instance);

        _context = new Mock<HubCallerContext>();
        _context.Setup(c => c.ConnectionId).Returns("conn-1");

        _allClients = new Mock<IClientProxy>();
        _clients = new Mock<IHubCallerClients>();
        _clients.Setup(c => c.All).Returns(_allClients.Object);

        _hub.Context = _context.Object;
        _hub.Clients = _clients.Object;

        // Clear static state before each test
        ClearConnected();
    }

    private static void ClearConnected()
    {
        var field = typeof(DrawHub).GetField("_connected",
            BindingFlags.NonPublic | BindingFlags.Static);
        var dict = field!.GetValue(null) as System.Collections.Concurrent.ConcurrentDictionary<string, string>;
        dict!.Clear();
    }

    [Fact]
    public async Task Join_WhenUnderCapacity_ReturnsSuccess()
    {
        _canvasService.Setup(s => s.GetCanvasAsPngAsync()).ReturnsAsync([0x89, 0x50]);
        _canvasService.Setup(s => s.GetCanvasSize()).Returns((1200, 800));

        var result = await _hub.Join("Alice");

        Assert.True(result.Success);
        Assert.Equal(1200, result.CanvasWidth);
        Assert.Equal(800, result.CanvasHeight);
        Assert.NotNull(result.CanvasData);
        Assert.Equal(100, result.SyncIntervalMs); // default from CollabDrawSettings
    }

    [Fact]
    public async Task Join_WhenAtCapacity_ReturnsFailure()
    {
        // Fill up capacity (MaxConnectedUsers = 2)
        var dict = GetConnectedDict();
        dict["other-1"] = "User1";
        dict["other-2"] = "User2";

        var result = await _hub.Join("Latecoming");

        Assert.False(result.Success);
        Assert.Contains("2 users max", result.Reason);
    }

    [Fact]
    public async Task Join_WhenAtCapacity_DoesNotCallCanvasService()
    {
        var dict = GetConnectedDict();
        dict["other-1"] = "User1";
        dict["other-2"] = "User2";

        await _hub.Join("Latecoming");

        _canvasService.Verify(s => s.GetCanvasAsPngAsync(), Times.Never);
    }

    [Fact]
    public async Task SendPixelPatch_WhenConnected_CallsSaveAndApply()
    {
        // First join to register the connection
        _canvasService.Setup(s => s.GetCanvasAsPngAsync()).ReturnsAsync([]);
        _canvasService.Setup(s => s.GetCanvasSize()).Returns((100, 80));
        await _hub.Join("Alice");

        var dto = new PixelPatchDto([new PixelData(0, 0, "#000000")], "Alice");
        _canvasService.Setup(s => s.SaveAndApplyAsync(dto))
            .ReturnsAsync(new PatchEvent { SequenceNumber = 1 });

        await _hub.SendPixelPatch(dto);

        _canvasService.Verify(s => s.SaveAndApplyAsync(dto), Times.Once);
    }

    [Fact]
    public async Task SendPixelPatch_WhenNotConnected_DoesNotCallSaveAndApply()
    {
        // No join - connection not registered
        var dto = new PixelPatchDto([], "Ghost");

        await _hub.SendPixelPatch(dto);

        _canvasService.Verify(s => s.SaveAndApplyAsync(It.IsAny<PixelPatchDto>()), Times.Never);
    }

    [Fact]
    public async Task OnDisconnectedAsync_RemovesUserFromConnected()
    {
        _canvasService.Setup(s => s.GetCanvasAsPngAsync()).ReturnsAsync([]);
        _canvasService.Setup(s => s.GetCanvasSize()).Returns((100, 80));
        await _hub.Join("Alice");

        var dict = GetConnectedDict();
        Assert.True(dict.ContainsKey("conn-1"));

        await _hub.OnDisconnectedAsync(null);

        Assert.False(dict.ContainsKey("conn-1"));
    }

    [Fact]
    public async Task OnDisconnectedAsync_UnknownConnection_DoesNotThrow()
    {
        // Should not throw even if connection was never registered
        var ex = await Record.ExceptionAsync(() => _hub.OnDisconnectedAsync(null));
        Assert.Null(ex);
    }

    [Fact]
    public async Task SendPixelPatch_AfterReconnectWithoutRejoin_DropsPacket()
    {
        // Simulate reconnect: new connectionId is not in _connected
        _context.Setup(c => c.ConnectionId).Returns("new-conn-after-reconnect");

        var dto = new PixelPatchDto([], "Alice");

        await _hub.SendPixelPatch(dto);

        _canvasService.Verify(s => s.SaveAndApplyAsync(It.IsAny<PixelPatchDto>()), Times.Never);
    }

    [Fact]
    public async Task Join_AfterReconnect_ReRegistersConnectionAndAllowsSendPixelPatch()
    {
        _canvasService.Setup(s => s.GetCanvasAsPngAsync()).ReturnsAsync([]);
        _canvasService.Setup(s => s.GetCanvasSize()).Returns((100, 80));

        // Simulate reconnect: change connectionId and re-join
        _context.Setup(c => c.ConnectionId).Returns("conn-after-reconnect");
        var result = await _hub.Join("Alice");

        Assert.True(result.Success);

        var dto = new PixelPatchDto([new PixelData(0, 0, "#000000")], "Alice");
        _canvasService.Setup(s => s.SaveAndApplyAsync(dto))
            .ReturnsAsync(new PatchEvent { SequenceNumber = 1 });

        await _hub.SendPixelPatch(dto);

        _canvasService.Verify(s => s.SaveAndApplyAsync(dto), Times.Once);
    }

    private static System.Collections.Concurrent.ConcurrentDictionary<string, string> GetConnectedDict()
    {
        var field = typeof(DrawHub).GetField("_connected",
            BindingFlags.NonPublic | BindingFlags.Static);
        return (System.Collections.Concurrent.ConcurrentDictionary<string, string>)field!.GetValue(null)!;
    }

    public void Dispose()
    {
        ClearConnected();
        _hub.Dispose();
    }
}
