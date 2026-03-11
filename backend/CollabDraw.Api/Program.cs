using CollabDraw.Api.Data;
using CollabDraw.Api.Hubs;
using CollabDraw.Api.Models;
using CollabDraw.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<CollabDrawSettings>(builder.Configuration.GetSection("CollabDraw"));

builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseSqlite(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddSingleton<ICanvasService, CanvasService>();
builder.Services.AddHostedService<CanvasSnapshotService>();

builder.Services.AddSignalR();

builder.Services.AddCors(opts =>
    opts.AddDefaultPolicy(p => p
        .WithOrigins("http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

var app = builder.Build();

// Apply EF migrations and initialize canvas projection on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

var canvasService = app.Services.GetRequiredService<ICanvasService>();
await canvasService.InitializeAsync();

app.UseCors();
app.UseStaticFiles();

app.MapHub<DrawHub>("/hubs/draw");
app.MapFallbackToFile("index.html");

app.Run();
