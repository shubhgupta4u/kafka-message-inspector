import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KafkaMessageDialogComponent } from './kafka-message-dialog.component';

describe('KafkaMessageDialogComponent', () => {
  let component: KafkaMessageDialogComponent;
  let fixture: ComponentFixture<KafkaMessageDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [KafkaMessageDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KafkaMessageDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
