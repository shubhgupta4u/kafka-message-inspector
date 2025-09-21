import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { KafkaService } from '../../services/kafka.service';
import { KafkaMessageSendRequest } from '../../models/kafka-connection-settings';

@Component({
  selector: 'app-kafka-message-dialog',
  standalone: false,
  templateUrl: './kafka-message-dialog.component.html',
  styleUrl: './kafka-message-dialog.component.css'
})
export class KafkaMessageDialogComponent {
  message: string = '';

  constructor(
    public dialogRef: MatDialogRef<KafkaMessageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string }
  ) { }

  onCancel(): void {
    this.dialogRef.close();
  }

  async onSend() {
    this.dialogRef.close(this.message);
  }
}
