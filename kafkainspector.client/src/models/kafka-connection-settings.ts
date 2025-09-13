export enum AutoOffsetReset {
  Latest = 0,
  Earliest = 1,
  SaslPlaintext = 2,
  SaslSsl = 3
}
export enum SecurityProtocol {
  Plaintext = 0,
  Ssl = 1,
  SaslPlaintext = 2,
  SaslSsl = 3
}
export interface KafkaTopicRequest {
  bootstrapServers: string;
  useSecureKafka: boolean;
  securityProtocol: SecurityProtocol;
  certificateFilePath?: string;
  pemFilePath?: string;
  pemKeyFilePath?: string;
  userApi?: string;
  userApiSecret?: string;
}
export interface KafkaStartRequest extends KafkaTopicRequest {
  topics: string[];
  autoOffsetReset: AutoOffsetReset;
}

