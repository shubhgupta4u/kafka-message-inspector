import { Component, ViewChild, ElementRef } from '@angular/core';
import { Toast } from 'bootstrap';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  standalone: false,
  styleUrls: ['./toast.component.css']
})
export class ToastComponent {
  toastMessage: string = '';
  @ViewChild('toastEl', { static: true }) toastEl!: ElementRef;

  show(message: string, type: 'primary' | 'success' | 'danger' | 'warning' = 'primary') {
    this.toastMessage = message;

    const el: HTMLElement = this.toastEl.nativeElement;
    el.className = `toast align-items-center text-bg-${type} border-0`;

    const toast = new Toast(el, { delay: 3000 }); // auto-hide after 3s
    toast.show();
  }
}
