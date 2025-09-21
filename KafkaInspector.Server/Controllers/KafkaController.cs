using KafkaInspector.Server.Managers;
using KafkaInspector.Server.Models;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
namespace KafkaInspector.Server.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class KafkaController : ControllerBase
    {
        private const string RootCertPath = @"C:\Kafka\onbkafka-ultitrust\dlas";
        private readonly KafkaConsumerManager _manager;

        public KafkaController(KafkaConsumerManager manager)
        {
            _manager = manager;
        }

        [HttpPost("topics")]
        public async Task<IActionResult> GetTopics(ListTopics req)
        {
            var config = new KafkaConfiguration
            {
                KafkaBootstrapServers = req.BootstrapServers,
                KafkaCertificateFilePath = Path.Combine(RootCertPath, req.CertificateFilePath),
                KafkaPemFilePath = Path.Combine(RootCertPath, req.PemFilePath),
                KafkaPemKeyFilePath = Path.Combine(RootCertPath, req.PemKeyFilePath),
                KafkaUserApi = req.UserApi,
                KafkaUserApiSecret = req.UserApiSecret,
                Protocol = req.SecurityProtocol,
                UseSecureKafka = req.UseSecureKafka
            };
            var context = new ValidationContext(config);
            var results = new List<ValidationResult>();

            bool isValid = Validator.TryValidateObject(config, context, results, true);

            if (!isValid)
            {
                return BadRequest(results);
            }
            var topics = await _manager.GetTopicsWithOffsetsAsync(config);
            return Ok(topics);
        }

        [HttpPost("start")]
        public async Task<IActionResult> Start(StartRequest req)
        {
            var config = new KafkaConfiguration
            {
                KafkaBootstrapServers = req.BootstrapServers,
                KafkaCertificateFilePath = Path.Combine(RootCertPath, req.CertificateFilePath),
                KafkaPemFilePath = Path.Combine(RootCertPath, req.PemFilePath),
                KafkaPemKeyFilePath = Path.Combine(RootCertPath, req.PemKeyFilePath),
                KafkaUserApi = req.UserApi,
                KafkaUserApiSecret = req.UserApiSecret,
                Protocol = req.SecurityProtocol,
                UseSecureKafka = req.UseSecureKafka
            };
            var context = new ValidationContext(config);
            var results = new List<ValidationResult>();

            bool isValid = Validator.TryValidateObject(config, context, results, true);

            if (!isValid)
            {
                return BadRequest(results);
            }
            var id = await _manager.StartConsumerAsync(config, req.Topics, req.AutoOffsetReset);
            return Ok(new { sessionId = id });
        }

        [HttpPost("send")]
        public async Task<IActionResult> Send(SendRequest req)
        {
            var config = new KafkaConfiguration
            {
                KafkaBootstrapServers = req.BootstrapServers,
                KafkaCertificateFilePath = Path.Combine(RootCertPath, req.CertificateFilePath),
                KafkaPemFilePath = Path.Combine(RootCertPath, req.PemFilePath),
                KafkaPemKeyFilePath = Path.Combine(RootCertPath, req.PemKeyFilePath),
                KafkaUserApi = req.UserApi,
                KafkaUserApiSecret = req.UserApiSecret,
                Protocol = req.SecurityProtocol,
                UseSecureKafka = req.UseSecureKafka
            };
            var context = new ValidationContext(config);
            var results = new List<ValidationResult>();

            bool isValid = Validator.TryValidateObject(config, context, results, true);

            if (!isValid)
            {
                return BadRequest(results);
            }
            try
            {
                if (string.IsNullOrEmpty(req.Topic))
                {
                    return BadRequest(new { error = $"Kafka Topic name is required." });
                }
                if (string.IsNullOrEmpty(req.Topic))
                {
                    return BadRequest(new { error = $"Kafka Message can't be blank." });
                }
                await _manager.ProduceMessageAsync(config, req.Topic, req.Message);
                return Ok();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error publishing: {ex.Message}");

                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new { error = "Failed to publish message", details = ex.Message }
                );
            }
        }

        [HttpPost("stop")]
        public async Task<IActionResult> Stop(StopRequest req)
        {
            await _manager.StopConsumerAsync(req.SessionId);
            return Ok();
        }
    }
}
