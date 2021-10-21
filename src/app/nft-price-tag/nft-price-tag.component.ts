import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-nft-price-tag',
  templateUrl: './nft-price-tag.component.html',
  styleUrls: ['./nft-price-tag.component.scss']
})
export class NftPriceTagComponent implements OnInit {
  @Input()
  price: string;
  @Input()
  label: string;
  constructor() { }

  ngOnInit(): void {
  }

}
