import { ContractService, GeoNFT, TokenStatus } from './../services/contract.service';
import { Component, OnInit, Input } from '@angular/core';
import { MapHelperService } from '../services/map-helper.service';
import { FormBuilder, Validators } from '@angular/forms';


@Component({
  selector: 'app-nft-main',
  templateUrl: './nft-main.component.html',
  styleUrls: ['./nft-main.component.scss']
})
export class NftMainComponent implements OnInit {
  nfts: GeoNFT[] = [];
  h3Key: String = '';
  h3KeyToNft: Map<String, GeoNFT> = new Map();
  TokenStatus = TokenStatus;
  startResaleForm = this.formBuilder.group({
    buyNowPriceOne: ['', [Validators.required]],
    bidAskPriceOne: ['', [Validators.required]],
    secondsAfter: ['', [Validators.required]],
  });
  bidResaleForm = this.formBuilder.group({
    priceOne: ['', [Validators.required]],
  });
  mintNftForm = this.formBuilder.group({
    nickname: ['', [Validators.required]],
  });
  constructor(
    private formBuilder: FormBuilder,
    private mapHelperService: MapHelperService,
    public contractService: ContractService
  ) {
  }

  ngOnInit(): void {
    this.mapHelperService.mapH3KeySelected$.subscribe((h3Key) => {
      this.h3Key = h3Key;
    });
    this.contractService.nfts$.subscribe((nfts) => {
      this.nfts = nfts;
      this.h3KeyToNft = new Map();
      for (const nft of this.nfts) {
        this.h3KeyToNft.set(nft.h3Key, nft);
      }
    })
  }

  hasNft(): boolean {
    return !!this.h3KeyToNft.get(this.h3Key);
  }

  getNft(): GeoNFT {
    return this.h3KeyToNft.get(this.h3Key);
  }

  isContractOwner(): boolean {
    return this.contractService.isContractOwner();
  }

  mintNft(): void {
    this.contractService.mintToken(this.h3Key, this.mintNftForm.value.nickname);
  }

  isTokenOwner(): boolean {
    return this.getNft().owner;
  }

  isSeller(): boolean {
    // The token is owned by contract, so get seller from resaleInfo
    return this.contractService.isSelfAddress(this.getNft().sellerAddress);
  }

  startResale(): void {
    this.contractService.startResale(
        this.h3Key, this.startResaleForm.value.buyNowPriceOne, 
        this.startResaleForm.value.bidAskPriceOne,
        this.startResaleForm.value.secondsAfter);
  }

  stopResale(): void {
    this.contractService.stopResale(this.h3Key);
  }

  canBidResale(): boolean {
    return this.contractService.canBid(this.getNft());
  }

  bidResale(): void {
    this.contractService.bidResale(this.h3Key, this.bidResaleForm.value.priceOne);
  }

  buyNow(): void {
    this.contractService.buyNow(this.h3Key, this.getNft().buyNowPrice);
  }
  
  isReadyForRetrieve(): boolean {
    return this.contractService.isReadyToRetrieve(this.getNft());
  }

  retrieveTokenFromResale(): void {
    this.contractService.retrieveTokenFromResale(this.h3Key);
  }

  getNftResaleProgress(): number {
    // Handle retrieve event (new owner)
    // Left panel: a list of my tokens
    const startMs = this.getNft().resaleStartTime.getTime();
    const endMs = this.getNft().resaleEndTime.getTime();
    const nowMs = new Date().getTime();
    const progress = (nowMs - startMs) / (endMs - startMs);
    return Math.round(progress * 100);
  }

  getHoursLeft(): string {
    const endMs = this.getNft().resaleEndTime.getTime();
    const nowMs = new Date().getTime();
    const hours = (endMs - nowMs) / 1000 / 3600;
    return hours.toFixed(2);
  }

  shouldShouldBidInfo(): boolean {
    return BigInt(this.getNft().bidderAddress).toString() != '0';
  }
}
