using Confluent.Kafka;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace KafkaInspector.Server.Models
{
    public class KafkaConfiguration : IValidatableObject
    {
        [Required(ErrorMessage = "Kafka bootstrap servers are required")]
        [MinLength(3, ErrorMessage = "Kafka bootstrap servers must be at least 3 characters")]
        [DisplayName("Kafka Bootstrap Servers")]
        public string KafkaBootstrapServers { get; set; } = string.Empty;

        [DisplayName("Use Secure Kafka")]
        public bool UseSecureKafka { get; set; } = false;

        [Required]
        [DisplayName("Security Protocol")]
        public SecurityProtocol Protocol { get; set; } = SecurityProtocol.Plaintext;

        // SASL / API Key based auth
        [DisplayName("User Api")]
        public string? KafkaUserApi { get; set; }
        [DisplayName("User Api Secret")]
        public string? KafkaUserApiSecret { get; set; }

        // SSL Certificates
        [DisplayName("Certificate File")]
        public string? KafkaCertificateFilePath { get; set; }
        [DisplayName("PEM File")]
        public string? KafkaPemFilePath { get; set; }
        [DisplayName("PEM Key File")]
        public string? KafkaPemKeyFilePath { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (UseSecureKafka)
            {
                switch (Protocol)
                {
                    case SecurityProtocol.SaslPlaintext:
                    case SecurityProtocol.SaslSsl:
                        if (string.IsNullOrWhiteSpace(KafkaUserApi) || string.IsNullOrWhiteSpace(KafkaUserApiSecret))
                        {
                            yield return new ValidationResult(
                                "User API and Secret are required for SASL authentication.",
                                new[] { nameof(KafkaUserApi), nameof(KafkaUserApiSecret) });
                        }
                        break;

                    case SecurityProtocol.Ssl:
                        if (string.IsNullOrWhiteSpace(KafkaCertificateFilePath) &&
                            (string.IsNullOrWhiteSpace(KafkaPemFilePath) || string.IsNullOrWhiteSpace(KafkaPemKeyFilePath)))
                        {
                            yield return new ValidationResult(
                                "SSL requires either a certificate file path OR both PEM + PEM Key file paths.",
                                new[] { nameof(KafkaCertificateFilePath), nameof(KafkaPemFilePath), nameof(KafkaPemKeyFilePath) });
                        }
                        break;
                }
            }
        }
    }
}
