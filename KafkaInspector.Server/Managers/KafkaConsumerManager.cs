using Confluent.Kafka;
using KafkaInspector.Server.Models;
using KafkaInspector.Server.Services;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace KafkaInspector.Server.Managers
{
    public class KafkaConsumerManager
    {
        private static readonly string[] InternalKafkaTopics =
        {
            "__consumer_offsets",
            "__transaction_state",
            "__cluster_metadata"
            // add more if required
        };
        private readonly IHubContext<MessageHub> _hub;
        private readonly ConcurrentDictionary<string, CancellationTokenSource> _running = new();

        public KafkaConsumerManager(IHubContext<MessageHub> hub)
        {
            _hub = hub;
        }

        public async Task<Dictionary<string, long>> GetTopicsWithOffsetsAsync(KafkaConfiguration kafkaConfiguration)
        {
            var config = GetAdminClientConfig(kafkaConfiguration);

            using var adminClient = new AdminClientBuilder(config).Build();
            using var consumer = new ConsumerBuilder<Ignore, Ignore>(
                GetConsumerConfig(kafkaConfiguration, Guid.NewGuid().ToString(), null)).Build();

            try
            {
                // Get metadata
                var metadata = adminClient.GetMetadata(TimeSpan.FromSeconds(10));

                var result = new Dictionary<string, long>();

                foreach (var topic in metadata.Topics
                                               .Where(t => !string.IsNullOrEmpty(t.Topic) &&
                                                           !InternalKafkaTopics.Contains(t.Topic, StringComparer.OrdinalIgnoreCase)))
                {
                    long totalLatestOffset = 0;

                    foreach (var partition in topic.Partitions)
                    {
                        try
                        {
                            var watermark = consumer.QueryWatermarkOffsets(new TopicPartition(topic.Topic, partition.PartitionId),
                                                                           TimeSpan.FromSeconds(5));
                            totalLatestOffset += watermark.High.Value; // latest offset per partition
                        }
                        catch (KafkaException ex)
                        {
                            Console.WriteLine($"Failed to query offsets for {topic.Topic} [Partition {partition.PartitionId}]: {ex.Message}");
                        }
                    }

                    result[topic.Topic] = totalLatestOffset;
                }

                return await Task.FromResult(result);
            }
            catch (KafkaException ex)
            {
                Console.WriteLine($"Kafka error: {ex.Message}");
                return new Dictionary<string, long>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"General error: {ex.Message}");
                return new Dictionary<string, long>();
            }
        }

        public async Task<string> StartConsumerAsync(KafkaConfiguration kafkaConfiguration, string[] topics, AutoOffsetReset autoOffset)
        {
            var sessionId = Guid.NewGuid().ToString("N");
            var cts = new CancellationTokenSource();

            if (!_running.TryAdd(sessionId, cts)) throw new Exception("Could not start session");

            if (topics == null || topics?.Length ==0)
            {
                topics = (await GetTopicsWithOffsetsAsync(kafkaConfiguration))?.Keys.ToArray() ?? new string[0] ;
            }

            _ = Task.Run(async () =>
            {
                var config = GetConsumerConfig(kafkaConfiguration, sessionId, autoOffset);

                using var consumer = new ConsumerBuilder<Ignore, string>(config).Build();
                consumer.Subscribe(topics);

                try
                {
                    while (!cts.Token.IsCancellationRequested)
                    {
                        try
                        {
                            var cr = consumer.Consume(cts.Token);
                            if (cr == null) continue;

                            if (cr.IsPartitionEOF)
                            {
                                await _hub.Clients.Group(sessionId).SendAsync("eof", new { topic = cr.Topic, partition = cr.Partition.Value, offset = cr.Offset.Value });
                                continue;
                            }

                            var msgObj = new
                            {
                                topic = cr.Topic,
                                partition = cr.Partition.Value,
                                offset = cr.Offset.Value,
                                timestamp = cr.Message.Timestamp.UtcDateTime,
                                value = cr.Message.Value
                            };

                            await _hub.Clients.Group(sessionId).SendAsync("message", msgObj);
                        }
                        catch (ConsumeException cex)
                        {
                            await _hub.Clients.Group(sessionId).SendAsync("error", new { error = cex.Error.Reason });
                        }
                    }
                }
                finally
                {
                    try { consumer.Close(); } catch { }
                    _running.TryRemove(sessionId, out _);
                    await _hub.Clients.Group(sessionId).SendAsync("stopped", new { sessionId });
                }
            }, cts.Token);

            return sessionId;
        }

        public Task StopConsumerAsync(string sessionId)
        {
            if (_running.TryRemove(sessionId, out var cts))
            {
                cts.Cancel();
                cts.Dispose();
            }

            return Task.CompletedTask;
        }

        private AdminClientConfig GetAdminClientConfig(KafkaConfiguration kafkaConfiguration)
        {
            var config = new AdminClientConfig
            {
                BootstrapServers = kafkaConfiguration?.KafkaBootstrapServers,
                EnableMetricsPush = true
            };
            if (kafkaConfiguration != null && kafkaConfiguration.UseSecureKafka)
            {
                if (kafkaConfiguration.Protocol == SecurityProtocol.Ssl)
                {
                    config.ApiVersionRequest = true;
                    config.SecurityProtocol = SecurityProtocol.Ssl;
                    config.SaslMechanism = null;
                    config.EnableSslCertificateVerification = false;
                    config.SslCertificateLocation = kafkaConfiguration.KafkaPemFilePath;
                    config.SslKeyLocation = kafkaConfiguration.KafkaPemKeyFilePath;
                    config.SslCaLocation = kafkaConfiguration.KafkaCertificateFilePath;
                }
                else
                {
                    config.SecurityProtocol = SecurityProtocol.SaslSsl;
                    config.SaslMechanism = SaslMechanism.Plain;
                    config.SaslUsername = kafkaConfiguration.KafkaUserApi;
                    config.SaslPassword = kafkaConfiguration.KafkaUserApiSecret;
                }
            }
            return config;
        }

        private ConsumerConfig GetConsumerConfig(KafkaConfiguration kafkaConfiguration, string sessionId, AutoOffsetReset? autoOffsetReset )
        {
            var config = new ConsumerConfig
            {
                BootstrapServers = kafkaConfiguration?.KafkaBootstrapServers,
                GroupId = "kafka-inspector-" + sessionId,
                EnableMetricsPush = true,
                HeartbeatIntervalMs = 3000,
                SessionTimeoutMs=20000,
                EnableAutoCommit=false
            };
            if (autoOffsetReset.HasValue)
            {
                config.AutoOffsetReset = autoOffsetReset.Value;
            }
            if (kafkaConfiguration != null && kafkaConfiguration.UseSecureKafka)
            {
                if(kafkaConfiguration.Protocol == SecurityProtocol.Ssl)
                {
                    config.ApiVersionRequest = true;
                    config.SecurityProtocol = SecurityProtocol.Ssl;
                    config.SaslMechanism = null;
                    config.EnableSslCertificateVerification = false;
                    config.SslCertificateLocation = kafkaConfiguration.KafkaPemFilePath;
                    config.SslKeyLocation = kafkaConfiguration.KafkaPemKeyFilePath;
                    config.SslCaLocation = kafkaConfiguration.KafkaCertificateFilePath;
                }
                else
                {
                    config.SecurityProtocol = SecurityProtocol.SaslSsl;
                    config.SaslMechanism = SaslMechanism.Plain;
                    config.SaslUsername = kafkaConfiguration.KafkaUserApi;
                    config.SaslPassword = kafkaConfiguration.KafkaUserApiSecret;
                }
            }
            return config;
        }
    }
}
