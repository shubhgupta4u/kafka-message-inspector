import { Component, OnInit, ViewChild } from '@angular/core';
import { KafkaService } from '../services/kafka.service';
import { AutoOffsetReset, SecurityProtocol } from '../models/kafka-connection-settings';
import { ToastComponent } from './toast/toast.component';
import { MatDialog } from '@angular/material/dialog';
import { KafkaMessageDialogComponent } from './kafka-message-dialog/kafka-message-dialog.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  @ViewChild(ToastComponent) toast!: ToastComponent;
  isBusy: boolean = false;
  readonly MAX_MESSAGE_COUNT: number = 5000;
  brokerName = 'secured-kafka01.dlas1.ucloud.int:9093,secured-kafka02.dlas1.ucloud.int:9093,secured-kafka03.dlas1.ucloud.int:9093, secured-kafka04.dlas1.ucloud.int:9093, secured-kafka05.dlas1.ucloud.int:9093';
  offset = 'Latest';
  messages: any[] = [];
  topics: any[] = [];
  running = false;
  selectedTopics: string[] = [];
  selectedMessage: any = null;
  sessionId: string | null = null;

  useSecure: boolean = true;
  secureMode: string = "SSL";
  caRootCertificatePath: string | null = "caroot.cer";
  pemCertificatePath: string | null = "kafka.pem";
  pemKeyCertificatePath: string | null = "kafka-key.pem";
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
  constructor(private kafkaService: KafkaService, private dialog: MatDialog) { 
  }

  openKafkaDialog(): void {
    this.isBusy = true;
    if (this.selectedTopics?.length > 0) {
      const dialogRef = this.dialog.open(KafkaMessageDialogComponent, {
        width: '600px',
        data: { title: `Publish Message to '${this.selectedTopics[0]}' topic` },
      });

      dialogRef.afterClosed().subscribe((result: string) => {
        this.isBusy = false;
        if (result) {
          this.sendMessage(result);
        }
      });
    }
  }

  async start() {
    try {
      this.isBusy = true;
      this.messages = [];
      this.applyFilter();
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
      this.isBusy = false;
    } catch (error:any) {
      console.error('Error fetching topics', error);
      this.toast.show(error.message, 'danger');
      this.isBusy = false;
    }
  }

  async sendMessage(payload: string) {
    try {
      this.isBusy = true;
      if (this.selectedTopics?.length > 0) {
        await this.kafkaService.produceKafkaMessage({
          bootstrapServers: this.brokerName,
          topic: this.selectedTopics[0],
          message: payload,
          useSecureKafka: this.useSecure,
          securityProtocol: this.secureMode == "SSL" ? SecurityProtocol.Ssl : SecurityProtocol.SaslSsl,
          userApi: this.apiUser ?? "",
          userApiSecret: this.apiSecret ?? "",
          pemFilePath: this.pemCertificatePath ?? "",
          pemKeyFilePath: this.pemKeyCertificatePath ?? "",
          certificateFilePath: this.caRootCertificatePath ?? "",
        });
      }
      this.isBusy = false;
      this.toast.show("Message Sent", 'success');
    } catch (error: any) {
      console.error('Error fetching topics', error);
      this.toast.show(error.message, 'danger');
      this.isBusy = false;
    }
  }

  async stop() {
    this.isBusy = true;
    await this.kafkaService.stopConsumer();
    this.running = false;
    this.isBusy = false;
  }

  async toggleTopic(topic: string) {
    if (this.sessionId)
      return;
    if (this.selectedTopics.includes(topic)) {
      // remove if already selected
      this.selectedTopics = this.selectedTopics.filter(t => t !== topic);
    } else {
      // add if not selected
      this.selectedTopics.push(topic);
    }
  }

  get formattedMessage(): string {
    try {
      return JSON.stringify(JSON.parse(this.selectedMessage?.value ?? '{}'), null, 2);
    } catch {
      return this.selectedMessage?.value ?? '';
    }
  }

  // Check if all topics are selected
  areAllSelected(): boolean {
    return this.topics.length > 0 && this.selectedTopics.length === this.topics.length;
  }

  isOneTopicSelected(): boolean {
    return this.topics.length > 0 && this.selectedTopics.length === 1;
  }

  // Toggle Select All
  toggleSelectAll(event: Event): void {
    if (this.sessionId)
      return;
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedTopics = this.topics.map(t => t.name); // select all
    } else {
      this.selectedTopics = []; // clear selection
    }
  }

  async listTopics() {
    try {
      this.isBusy = true;
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
      this.isBusy = false;
    } catch (error:any) {
      console.error('Error listing topics', error);
      this.topics = [];
      this.toast.show(error.message, 'danger');
      this.isBusy = false;
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
