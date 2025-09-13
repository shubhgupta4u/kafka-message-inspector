import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, interval, Observable, Subscription } from 'rxjs';
import { environment } from '../environments/environment';
import { KafkaStartRequest, KafkaTopicRequest } from '../models/kafka-connection-settings';
import { KafkaConnectionValidationFailure } from '../models/KafkaConnectionValidationFailure';

@Injectable({ providedIn: 'root' })
export class KafkaService {
  private readonly POLLING_INTERVAL: number = 120000;
  private connection!: signalR.HubConnection;
  private sessionIdSubject = new BehaviorSubject<string | null>(null); // ✅ observable sessionId
  sessionId$: Observable<string | null> = this.sessionIdSubject.asObservable();

  private baseUrl = environment.apiBaseUrl;

  // 🔹 for polling healthcheck
  private healthCheckSub?: Subscription;
  private healthStatusSubject = new BehaviorSubject<any>(null);
  healthStatus$: Observable<any> = this.healthStatusSubject.asObservable();

  constructor(private http: HttpClient) { }

  async connect(onMessage: (msg: any) => void) {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(`${this.baseUrl}/messageHub`)
      .withAutomaticReconnect()
      .build();

    this.connection.on('message', onMessage);
    this.connection.on('error', e => console.error(e));
    this.connection.on('stopped', () => this.sessionIdSubject.next(null));

    await this.connection.start();
  }

  async startConsumer(kafkaStartRequest: KafkaStartRequest) {
    try {
      const res: any = await this.http.post(`${this.baseUrl}/api/kafka/start`, kafkaStartRequest).toPromise();

      const sessionId = res.sessionId ?? null;
      this.sessionIdSubject.next(sessionId);

      if (sessionId) {
        await this.connection.invoke('Join', sessionId);
        this.startHealthCheckPolling();
      } else {
        throw Error("Failed to connect to Kafka Broker.")
      }
    } catch (error: any) {
      this.handleError(error);
    }    
  }

  async stopConsumer() {
    const sessionId = this.sessionIdSubject.value;
    if (!sessionId) return;

    await this.http.post(`${this.baseUrl}/api/kafka/stop`, { sessionId }).toPromise();
    this.sessionIdSubject.next(null);
    this.stopHealthCheckPolling();
  }

  async getTopics(kafkaTopicRequest: KafkaTopicRequest): Promise<any> {
    try {
      const topics: any = await this.http.post(`${this.baseUrl}/api/kafka/topics`, kafkaTopicRequest).toPromise();
      return topics ?? [];
    } catch (error: any) {
      this.handleError(error);
    }
  }

  // 🔹 Healthcheck polling
  private startHealthCheckPolling() {
    // stop any existing polling first
    this.stopHealthCheckPolling();

    this.healthCheckSub = interval(this.POLLING_INTERVAL).subscribe(() => {
      this.http.get(`${this.baseUrl}/api/healthcheck`).subscribe({
        next: (res) => this.healthStatusSubject.next(res),
        error: (err) => this.healthStatusSubject.next({ status: 'Unhealthy', error: err })
      });
    });
  }

  private stopHealthCheckPolling() {
    if (this.healthCheckSub) {
      this.healthCheckSub.unsubscribe();
      this.healthCheckSub = undefined;
    }
    this.healthStatusSubject.next(null);
  }

  private handleError(error: any): never {
    if (error.status === 400 && error.error) {
      let errorMessage = '';

      try {
        const errors = error.error as KafkaConnectionValidationFailure[];
        errorMessage = errors
          .map(e => `${e.memberNames.join(', ')}: ${e.errorMessage}`)
          .join('\n');
      } catch {
        errorMessage = typeof error.error === 'string'
          ? error.error
          : 'Bad Request';
      }

      console.error('Validation Error:', errorMessage);
      throw new Error(errorMessage);
    }

    console.error('Unexpected Error:', error);
    throw error;
  }

}
