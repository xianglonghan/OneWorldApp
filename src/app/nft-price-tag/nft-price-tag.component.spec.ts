import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftPriceTagComponent } from './nft-price-tag.component';

describe('NftPriceTagComponent', () => {
  let component: NftPriceTagComponent;
  let fixture: ComponentFixture<NftPriceTagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NftPriceTagComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NftPriceTagComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
