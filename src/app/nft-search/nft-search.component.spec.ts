import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NftSearchComponent } from './nft-search.component';

describe('NftSearchComponent', () => {
  let component: NftSearchComponent;
  let fixture: ComponentFixture<NftSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NftSearchComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NftSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
