import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftMainComponent } from './nft-main.component';

describe('NftMainComponent', () => {
  let component: NftMainComponent;
  let fixture: ComponentFixture<NftMainComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NftMainComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NftMainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
