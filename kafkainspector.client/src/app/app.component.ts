import { Component, OnInit, ViewChild } from '@angular/core';
import { KafkaService } from '../services/kafka.service';
import { AutoOffsetReset, SecurityProtocol } from '../models/kafka-connection-settings';
import { ToastComponent } from './toast/toast.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  @ViewChild(ToastComponent) toast!: ToastComponent;
  readonly MAX_MESSAGE_COUNT: number = 5000;
  brokerName = 'localhost:9092';
  offset = 'Latest';
  messages: any[] = [];
  topics: any[] = [];
  running = false;
  selectedTopics: string[] = [];
  selectedMessage: any = null;
  sessionId: string | null = null;

  useSecure: boolean = false;
  secureMode: string = "SSL";
  caRootCertificatePath: string | null = null;
  pemCertificatePath: string | null = null;
  pemKeyCertificatePath: string | null = null;
  selectedFile: File | null = null;
  apiUser: string | null = null;
  apiSecret: string | null = null;

  filteredMessages: any[] = [];  // After applying search filter
  paginatedMessages: any[] = []; // Current page messages
  searchText: string = '';

  currentPage: number = 1;
  pageSize: number = 10;
  pageSizes: number[] = [5, 10, 20, 50, 100];
  totalPages: number = 1;
  pages: number[] = [];
  constructor(private kafkaService: KafkaService) { 
  }

  async start() {
    try {
      this.messages = [];
      await this.kafkaService.startConsumer({
        bootstrapServers: this.brokerName,
        topics: this.selectedTopics,
        autoOffsetReset: this.offset === "Latest" ? AutoOffsetReset.Latest : AutoOffsetReset.Earliest,
        useSecureKafka: this.useSecure,
        securityProtocol: this.secureMode == "SSL" ? SecurityProtocol.Ssl : SecurityProtocol.SaslSsl,
        userApi: this.apiUser ?? "",
        userApiSecret: this.apiSecret ?? "",
        pemFilePath: this.pemCertificatePath ?? "",
        pemKeyFilePath: this.pemKeyCertificatePath ?? "",
        certificateFilePath: this.caRootCertificatePath ?? "",
      });
      this.running = true;
    } catch (error:any) {
      console.error('Error fetching topics', error);
      this.toast.show(error.message, 'danger');
    }
  }

  async stop() {
    await this.kafkaService.stopConsumer();
    this.running = false;
  }

  async toggleTopic(topic: string) {
    if (this.selectedTopics.includes(topic)) {
      // remove if already selected
      this.selectedTopics = this.selectedTopics.filter(t => t !== topic);
    } else {
      // add if not selected
      this.selectedTopics.push(topic);
    }
  }

  async listTopics() {
    try {
      const res: any = await this.kafkaService.getTopics({
        bootstrapServers: this.brokerName,
        useSecureKafka: this.useSecure,
        securityProtocol: this.secureMode == "SSL" ? SecurityProtocol.Ssl : SecurityProtocol.SaslSsl,
        userApi: this.apiUser ?? "",
        userApiSecret: this.apiSecret ?? "",
        pemFilePath: this.pemCertificatePath ?? "",
        pemKeyFilePath: this.pemKeyCertificatePath ?? "",
        certificateFilePath: this.caRootCertificatePath ?? "",
      });

      this.topics = Object.entries(res).map(([name, offset]) => ({
        name,
        offset
      }));
    } catch (error:any) {
      console.error('Error listing topics', error);
      this.topics = [];
      this.toast.show(error.message, 'danger');
    }
  }

  copyToClipboard(text: string | undefined) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }

  ngOnInit() {
    this.kafkaService.connect(msg => {
      this.messages.unshift(msg);

      // optional: trim old messages
      if (this.messages.length > this.MAX_MESSAGE_COUNT) {
        this.messages.pop();
      }
      this.applyFilter();
      this.toast.show(`New message received on topic '${msg.topic} [${msg.offset}]'`, 'success');
    });
    this.kafkaService.sessionId$.subscribe(sessId => {
      this.sessionId = sessId;
    });
  }

  getTotalPages() {
    return Math.ceil(this.filteredMessages.length / this.pageSize) || 1;
  }

  // Call after messages update
  updatePagination() {
    this.totalPages = this.getTotalPages();
    // Build page numbers [1,2,3,...]
    this.pages = Array.from({ length: this.totalPages }, (_, i) => i + 1);

    // Clamp current page if too high
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedMessages = this.filteredMessages.slice(startIndex, endIndex);
  }

  // Search filter
  applyFilter() {
    if (!this.searchText.trim()) {
      this.filteredMessages = [...this.messages];
    } else {
      const term = this.searchText.toLowerCase();
      this.filteredMessages = this.messages.filter(msg =>
        msg.topic.toLowerCase().includes(term) ||
        (msg.value && msg.value.toLowerCase().includes(term))
      );
    }
    if (this.getTotalPages() < this.currentPage) {
      this.currentPage = this.getTotalPages();
    }    
    this.updatePagination();
  }

  // Pagination controls
  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  // Example: when messages come in from Kafka API
  setMessages(newMessages: any[]) {
    this.messages = newMessages;
    this.applyFilter(); // will reset filter + pagination
  }

  onFileSelected(event: Event, fileKey:number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      if (fileKey === 0) {
        this.caRootCertificatePath = this.selectedFile.name;
      }
      else if (fileKey === 1) {
        this.pemCertificatePath = this.selectedFile.name;
      } else {
        this.pemKeyCertificatePath = this.selectedFile.name; 
      }
    }
  }

  changePageSize() {
    this.currentPage = 1;
    this.updatePagination();
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredMessages.length);
  }
}
