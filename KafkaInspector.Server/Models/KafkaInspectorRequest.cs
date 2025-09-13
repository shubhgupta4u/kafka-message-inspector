using Confluent.Kafka;

namespace KafkaInspector.Server.Models
{
    public record ListTopics(string BootstrapServers, bool UseSecureKafka, SecurityProtocol SecurityProtocol, string CertificateFilePath, string PemFilePath, string PemKeyFilePath, string UserApi, string UserApiSecret);
    public record StartRequest(string BootstrapServers, bool UseSecureKafka, SecurityProtocol SecurityProtocol, string CertificateFilePath, string PemFilePath, string PemKeyFilePath, string UserApi, string UserApiSecret, string[] Topics, AutoOffsetReset AutoOffsetReset = AutoOffsetReset.Latest);
    public record StopRequest(string SessionId);
}
