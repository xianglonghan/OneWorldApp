import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LngLat } from 'mapbox-gl';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import abi from './abi/ABI.json';
const Web3 = require('web3');

export enum TokenStatus {
  INVALID,
  HOLD,
  RESALE,
}

export interface TokenInfo {
  price: string;
  status: string;
  layer: string;
  resaleId: string;
}

export interface MintTokenEvent {
  blockNumber: number;
  returnValues: {
    tokenInfo: TokenInfo;
    tokenId: string;
  };
}

export interface GeoNFT {
  price: string;
  status: TokenStatus;
  tokenId: string,
  h3Key: string
  layer: number;
  ownerAddress: string;
  owner: boolean;
  sellerAddress: string;
  buyNowPrice: string;
  resaleStartTime: Date;
  resaleEndTime: Date;
  bidAskPrice: string,
  bidderAddress: string;
  highestBidPrice: string;
  resaleId?: string;
}

export interface WalletInfo {
  address: string;
  balance: string;
  isContractOwner?: boolean;
}

export interface TransactionStartedEvent {
  txid: string;
}

export interface TransactionResultEvent {
  success: boolean;
  fee: number;
  confirmationNumber: number;
}

export interface BidResaleEvent {
  returnValues: {
    latestInfo: ResaleInfo; // name of the property? auctionInfo, or something else?
    tokenId: string;
    resaleId: string;
  };
}

export interface ResaleInfo {
  highestBidPrice: string;
  bidderAddress: string;
  bidAskPrice: string;
  buyNowPrice: string;
  tokenID: string;
  resaleEndTime: string;
  sellerAddress: string;
}

export interface StartResaleEvent {
  returnValues: {
    tokenId: string;
    resaleId: string;
    creationTime: string;
    resaleInfo: ResaleInfo;
  };
}

export interface StopResaleEvent {
  returnValues: {
    tokenId: string;
    resaleId: string;
    seller: string;
  };
}

export interface BuyNowEvent {
  returnValues: {
    tokenId: string;
    resaleId: string;
    buyer: string;
    resaleInfo: ResaleInfo;
  };
}

export interface RetrieveTokenFromResaleEvent {
  returnValues: {
    tokenId: string;
    resaleInfo: ResaleInfo
  };
}

export type TransactionEventUnion = TransactionResultEvent | TransactionStartedEvent;
@Injectable()
export class ContractService {
  contractAddress = '0x29954b1dA317A5298C32C20B6BE4BBDa9719a392';
  blockNumber = 15810550;
  private loggedSubject = new BehaviorSubject<boolean>(false);
  logged$ = this.loggedSubject.asObservable();

  private walletInfoSubject = new BehaviorSubject<WalletInfo>(null);
  walletInfo$ = this.walletInfoSubject.asObservable();

  private errorSubject = new BehaviorSubject<string>('');
  error$ = this.errorSubject.asObservable();

  private nftMap = new Map();
  private nftsSubject = new BehaviorSubject<GeoNFT[]>([]);
  nfts$ = this.nftsSubject.asObservable();

  private transactionsSubject = new Subject<TransactionEventUnion>();
  transactions$ = this.transactionsSubject.asObservable();

  contract: any;
  currentWeb3: any;
  wallet: any;
  selectedAddress: string;

  initializing = false;

  contractOwnerAddress: string;
  constructor(private domSanitizer: DomSanitizer) { }

  async init(): Promise<void> {
    this.initializing = true;
    this.wallet = (window as any).ethereum || (window as any).onewallet;
    if (!this.wallet) {
      throw new Error('No supported wallet');
    }

    // Ask User permission to connect to Metamask
    //   await window.ethereum.enable();
    try {
      if (!this.wallet.selectedAddress) {
        await this.wallet.enable(); // <<< ask for permission
      }
      this.currentWeb3 = new Web3(this.wallet);
      this.contract = new this.currentWeb3.eth.Contract(
        abi,
        this.contractAddress
      );

      this.selectedAddress = this.wallet.selectedAddress;
      console.log('selected address', this.selectedAddress);

      await this.loadWalletInfo();
      this.setEvents();
      this.initializing = false;
      this.loggedSubject.next(true);
    } catch (error) {
      this.initializing = false;
      this.errorSubject.next(error);
      throw new Error(error);
    }
  }
  
  private getNftByTokenId(tokenId: string) : GeoNFT {
    return this.nftMap.get(tokenId);
  }

  setEvents(): void {
    this.wallet.on('networkChanged', (networkId) => {
      // Time to reload your interface with the new networkId
      console.log('New network ID:', networkId);
      if (networkId !== '0x6357d2e0') {
        console.error('You are not connected to harmony testnet s0');
        this.errorSubject.next('You are not connected to harmony testnet s0');
        return;
      }
    });
    // Update local cache if there are new or updated NFTs 
    this.contract.events.MintTokenEvent({})
      .on('data', (mintTokenEvent: MintTokenEvent) => {
        // Only add if not cached already
        if (!this.nftMap.has(mintTokenEvent.returnValues.tokenId)) {
          this.reloadNft(mintTokenEvent.returnValues.tokenId);
        }
      });
    this.contract.events.StartResaleEvent({})
      .on('data', (startResaleEvent: StartResaleEvent) => {
        // Only update if it's already in cache (viewport). Don't care
        // about updates 1k miles away
        if (this.nftMap.has(startResaleEvent.returnValues.tokenId)) {
          this.reloadNft(startResaleEvent.returnValues.tokenId);
        }
      });
    this.contract.events.StopResaleEvent({})
      .on('data', (stopResaleEvent: StopResaleEvent) => {
        if (this.nftMap.has(stopResaleEvent.returnValues.tokenId)) {
          this.reloadNft(stopResaleEvent.returnValues.tokenId);
        }
      });
    this.contract.events.BuyNowEvent({})
      .on('data', (buyNowEvent: BuyNowEvent) => {
        if (this.nftMap.has(buyNowEvent.returnValues.tokenId)) {
          this.reloadNft(buyNowEvent.returnValues.tokenId);
        }
      });  
    this.contract.events.BidResaleEvent({})
      .on('data', (bidResaleEvent: BidResaleEvent) => {
        if (this.nftMap.has(bidResaleEvent.returnValues.tokenId)) {
          this.reloadNft(bidResaleEvent.returnValues.tokenId);
        }
      });    
    this.contract.events.RetrieveTokenFromResaleEvent({})
      .on('data', (retrieveTokenFromResaleEvent: RetrieveTokenFromResaleEvent) => {
        if (this.nftMap.has(retrieveTokenFromResaleEvent.returnValues.tokenId)) {
          this.reloadNft(retrieveTokenFromResaleEvent.returnValues.tokenId);
        }
      });
     
  }

  private epochToDate(epoch: string): Date {
    const date = new Date(0);
    const utcSeconds = Number(epoch);
    date.setUTCSeconds(utcSeconds);
    return date;
  }

  private async loadWalletInfo(): Promise<void> {
    return new Promise((resolve, reject) => {
      const address = this.wallet.selectedAddress;
      Promise.all(
        [
          this.currentWeb3.eth
          .getBalance(this.selectedAddress),
          this.loadContractOwnerAddress()
        ]
      )
        .then(([balance]) => {
          const displayBalance = this.currentWeb3.utils.fromWei(balance, 'ether');
          this.walletInfoSubject.next({
            address,
            balance: displayBalance,
            isContractOwner: this.isContractOwner()
          });
          resolve();
        }, (err) => reject(err));
    });
  }

  isContractOwner(): boolean {
    return this.selectedAddress.toLocaleLowerCase() === this.contractOwnerAddress.toLowerCase();
  }

  isSelfAddress(address: string): boolean {
    return this.selectedAddress.toLocaleLowerCase() === address.toLowerCase();
  }

  getStatus(status: string) : TokenStatus {
    switch (status) {
      case '0':
        return TokenStatus.INVALID;
      case '1':
        return TokenStatus.HOLD;
      case '2':
        return TokenStatus.RESALE;
    }
    return TokenStatus.INVALID;
  }

  async ownerOf(tokenId: string): Promise<string> {
    // TODO: treat error as lack of owner
    return new Promise((resolve) => {
      this.contract.methods
        .ownerOf(tokenId)
        .call({ from: this.selectedAddress })
        .then((result) => {
          resolve(result);
        })
        .catch(e => {
          resolve(null);
        });
    });
  }

  canBid(nft: GeoNFT): boolean {
    return nft.resaleEndTime.getTime() > Date.now() &&
        nft.status == TokenStatus.RESALE;
  }

  isReadyToRetrieve(nft: GeoNFT): boolean {
    return nft.bidderAddress &&
        nft.bidderAddress.toLowerCase() === this.selectedAddress.toLowerCase() &&
        nft.resaleEndTime.getTime() < Date.now() &&
        nft.status == TokenStatus.RESALE;
  }

  mintToken(h3Key: String, nickname: string): void {
    const transaction = this.contract.methods
      .mintToken(this.h3KeyToTokenId(h3Key), nickname, 1)
      .send({ 
        from: this.selectedAddress, 
        value: new Web3.utils.BN(this.oneToWei('1'))});
    this.listenToTransaction(transaction);
  }

  startResale(h3Key: String, buyNowPriceOne: number, bidAskPriceOne: number, 
    secondsAfter: number): void {
    const transaction = this.contract.methods
      .startResale(this.h3KeyToTokenId(h3Key),
          new Web3.utils.BN(this.oneToWei(buyNowPriceOne.toString())), 
          new Web3.utils.BN(this.oneToWei(bidAskPriceOne.toString())),
          secondsAfter)
      .send({ from: this.selectedAddress });
    this.listenToTransaction(transaction);
  }

  stopResale(h3Key: String): void {
    const transaction = this.contract.methods
      .stopResale(this.h3KeyToTokenId(h3Key))
      .send({ from: this.selectedAddress});
    this.listenToTransaction(transaction);
  }

  buyNow(h3Key: String, priceWei: string): void {
    const transaction = this.contract.methods
      .buyNow(this.h3KeyToTokenId(h3Key))
      .send({ from: this.selectedAddress, value: priceWei});
    this.listenToTransaction(transaction);
  }

  bidResale(h3Key: String, priceOne: number): void {
    const transaction = this.contract.methods
      .bidResale(this.h3KeyToTokenId(h3Key))
      .send({ from: this.selectedAddress, value: this.oneToWei(priceOne.toString())});
    this.listenToTransaction(transaction);
  }

  retrieveTokenFromResale(h3Key: String): void {
    const transaction = this.contract.methods
      .retrieveTokenFromResale(this.h3KeyToTokenId(h3Key))
      .send({ from: this.selectedAddress});
    this.listenToTransaction(transaction);
  }

  async reloadNft(tokenId: string) {
    this.loadNfts([this.tokenIdToH3Key(tokenId)]);
  }

  async loadNfts(h3Keys: String[]) {
    try {
      const tokenIds = h3Keys.map(k => this.h3KeyToTokenId(k));
      const nfts = await this.getTokenAndResaleInfos(tokenIds);
      // Add/updated NFTs to local cache, this is safe as no NFT burning
      for (const nft of nfts) {
        this.nftMap.set(nft.tokenId, nft);
      }
      // Notify map and UIs
      this.nftsSubject.next([...this.nftMap.values()]);
      return nfts;
    } catch (e) {
      console.log(e);
    }
  }

  async getTokenAndResaleInfos(tokenIds: string[]) {
    const results = await this.contract.methods
      .getTokenAndResaleInfos(tokenIds)
      .call({ from: this.selectedAddress });
    const nfts = results
        .filter(result => result.isValid)
        .map(result => this.mapTokenAndResaleInfoToGeoNft(result));
    return nfts;
  }

  mapTokenAndResaleInfoToGeoNft(result: any) : GeoNFT {
    return {
      tokenId: result.tokenId,
      h3Key: this.tokenIdToH3Key(result.tokenId),
      layer: Number(result.tokenInfo.layer),
      ownerAddress: result.ownerAddress,
      owner: result.ownerAddress.toLowerCase() === this.selectedAddress.toLowerCase(),
      resaleId: result.tokenInfo.resaleId,
      resaleStartTime: new Date(Number(result.resaleInfo.resaleStartTime) * 1000),
      resaleEndTime: new Date(Number(result.resaleInfo.resaleEndTime) * 1000),
      sellerAddress: result.resaleInfo.sellerAddress,
      bidAskPrice: result.resaleInfo.bidAskPrice,
      buyNowPrice: result.resaleInfo.buyNowPrice,
      status: this.getStatus(result.tokenInfo.status),
      price: result.tokenInfo.price,
      bidderAddress: result.resaleInfo.bidderAddress,
      highestBidPrice: result.resaleInfo.highestBidPrice
    };
  }

  async loadMyNfts(): Promise<{ownedNfts, sellerNfts, bidNfts, toRetrieveNfts}> {
    // TODO(xlhan): This is a tmp solution, it doesn't scale
    const mintTokenEvents = await this.contract.getPastEvents(
        'MintTokenEvent', { fromBlock: this.blockNumber });
    // const blockNumbers = mintTokenEvents.map(e => e.blockNumber);
    // blockNumbers.sort();
    // console.log('Min block number: ' + blockNumbers[0]);
    const tokenIds = mintTokenEvents.map(e => e.returnValues.tokenId);
    const allNfts = await this.getTokenAndResaleInfos(tokenIds);
    const ownedNfts = allNfts.filter(nft => nft.owner);
    const sellerNfts = allNfts.filter(nft => this.isSelfAddress(nft.sellerAddress));
    const bidNfts = allNfts.filter(nft => this.isSelfAddress(nft.bidderAddress));
    const toRetrieveNfts = allNfts.filter(nft => this.isReadyToRetrieve(nft));
    return {ownedNfts, sellerNfts, bidNfts, toRetrieveNfts};
  }

  h3KeyToTokenId(h3Key: String) : string {
    return BigInt('0x' + h3Key).toString();
  }

  tokenIdToH3Key(tokenId: string) {
    return BigInt(tokenId).toString(16)
  }

  async isApprovedForAll(): Promise<boolean> {
    return this.contract.methods.isApprovedForAll(this.selectedAddress, this.contractAddress);
  }

  private async loadContractOwnerAddress(): Promise<void> {
    this.contractOwnerAddress = await this.contract.methods.owner().call({ from: this.selectedAddress });

    this.walletInfoSubject.next({
      ...this.walletInfoSubject.getValue(),
      ...{ isContractOwner: this.contractOwnerAddress && this.contractOwnerAddress.toLowerCase() === this.selectedAddress }
    });
  }

  listenToTransaction(transaction): void {
    transaction
      .on('transactionHash', (hash: string) => {
        console.log(
          'Transaction sent successfully. Check console for Transaction hash'
        );
        this.transactionsSubject.next({
          txid: hash
        });
        console.log('Transaction Hash is ', hash);
      })
      .on('error', (error) => {
        console.error(error);
        this.transactionsSubject.error(error);
      })
      .once('confirmation', async (confirmationNumber, receipt) => {
        if (receipt.status) {
          console.log('Transaction processed successfully', receipt);
          this.transactionsSubject.next({
            fee: receipt.fee,
            success: true,
            txid: receipt.id,
            confirmationNumber
          });
        } else {
          this.transactionsSubject.error({
            fee: receipt.fee,
            success: false,
            txid: receipt.id,
            confirmationNumber
          });
        }
        await this.loadWalletInfo();
        console.log(receipt);
      });
  }

  weiToOne(balance): string {
    return this.currentWeb3.utils.fromWei(balance, 'ether');
  }


  oneToWei(balance): string {
    return this.currentWeb3.utils.toWei(balance, 'ether');
  }

  logout(): void {
    // TODO: to implement
    this.currentWeb3 = null;
    this.contract = null;
    this.selectedAddress = null;
    this.loggedSubject.next(false);
    window.localStorage.removeItem('wasStarted');

  }

}
