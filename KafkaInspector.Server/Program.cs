using KafkaInspector.Server;
using KafkaInspector.Server.Managers;
using KafkaInspector.Server.Services;
using Microsoft.Extensions.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

// Add CORS services
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularDev", policy =>
    {
        policy.WithOrigins("https://localhost:54869") // Allow only this origin
              .AllowAnyHeader()                     // Allow any headers
              .AllowAnyMethod()                     // Allow GET, POST, etc.
              .AllowCredentials();                  //required for SignalR with credentials  
    });
});

// Add services to the container.
builder.Services.AddControllers(options =>
{
    options.Conventions.Add(new RoutePrefixConvention("api"));
});
builder.Services.AddSignalR();
builder.Services.AddSingleton<KafkaConsumerManager>();
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy("API is running"));

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // Use CORS
    app.UseCors("AllowAngularDev");
}
app.UseSwagger();
app.UseSwaggerUI();


app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.MapHub<MessageHub>("/messageHub");

app.Run();