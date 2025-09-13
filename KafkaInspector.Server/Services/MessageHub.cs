using Microsoft.AspNetCore.SignalR;
using System.Text.RegularExpressions;

namespace KafkaInspector.Server.Services
{
    public class MessageHub : Hub
    {
        public async Task Join(string sessionId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
            await Clients.Caller.SendAsync("joined", sessionId);
        }
    }
}
