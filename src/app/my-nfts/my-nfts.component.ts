import { Component, OnInit } from '@angular/core';
import { ContractService, GeoNFT, NFT, SoldStatus } from './../services/contract.service';

@Component({
  selector: 'app-my-nfts',
  templateUrl: './my-nfts.component.html',
  styleUrls: ['./my-nfts.component.scss']
})
export class MyNftsComponent implements OnInit {
  ownedNfts: GeoNFT[];
  sellerNfts: GeoNFT[];
  bidNfts: GeoNFT[];
  toRetrieveNfts: GeoNFT[];
  constructor(
    public contractService: ContractService
  ) { }

  ngOnInit(): void {

  }

  async onGetMyNftsClick() {
    const {ownedNfts, sellerNfts, bidNfts, toRetrieveNfts} = 
        await this.contractService.loadMyNfts();
    this.ownedNfts = ownedNfts;
    this.sellerNfts = sellerNfts;
    this.bidNfts = bidNfts;
    this.toRetrieveNfts = toRetrieveNfts;
  }

}
