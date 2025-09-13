using Confluent.Kafka;
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
                KafkaCertificateFilePath = req.CertificateFilePath,
                KafkaPemFilePath = req.PemFilePath,
                KafkaPemKeyFilePath = req.PemKeyFilePath,
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
                KafkaCertificateFilePath = req.CertificateFilePath,
                KafkaPemFilePath = req.PemFilePath,
                KafkaPemKeyFilePath = req.PemKeyFilePath,
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

        [HttpPost("stop")]
        public async Task<IActionResult> Stop(StopRequest req)
        {
            await _manager.StopConsumerAsync(req.SessionId);
            return Ok();
        }
    }
}
