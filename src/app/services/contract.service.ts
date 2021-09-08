import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LngLat } from 'mapbox-gl';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import abi from './abi/ABI.json';
const Web3 = require('web3');

export enum SoldStatus {
  UNAVAILABLE,
  SOLD,
  AVAILABLE,
  OWNED,
  RESALE,
  AWAITING_TRANSFER
}
// declare let window: any;
export interface NFT {
  name: string;
  location: string;
  status: string;
  price: string;
  layer: number;
  owner?: string;
}

export interface TokenInfo {
  price: string;
  status: string;
  layer: string;
}

export interface MintTokenEvent {
  blockNumber: number;
  returnValues: {
    tokenInfo: TokenInfo;
    tokenId: string;
  };
}

export interface BidInfo {
  highestBid: string;
  bidderAddress: string;
}

export interface GeoNFT {
  name: string;
  location: LngLat;
  image?: SafeHtml;
  price: string;
  status: SoldStatus;
  id: number;
  tokenId: string,
  h3Key: string
  layer: number;
  ownerAddress: string;
  owner: boolean;
  saleTime?: Date;
  bidInfo?: BidInfo;
  sellerAddress: string;
  resalePrice: string,
  resaleCreationTime?: Date;
  resaleEndTime?: Date;
  resaleTime?: Date;
  creationTime?: Date;
  latestBidAddress?: string;
  hasUserBids?: boolean;
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

export interface NFTSaleEvent {
  address: string;
  tokenId: string;
}

export interface NftBidEvent {
  returnValues: {
    newBid: BidInfo; // name of the property? auctionInfo, or something else?
    tokenId: string;
  };

}

export interface ResaleBidEvent {
  returnValues: {
    latestInfo: ResaleInfo; // name of the property? auctionInfo, or something else?
    tokenID: string;
    resaleId: string;
  };
}

export interface BidResaleEvent {
  returnValues: {
    latestInfo: ResaleInfo; // name of the property? auctionInfo, or something else?
    tokenId: string;
    resaleId: string;
  };
}

export interface BidViewModel {
  highestBid: string;
  latestBidIsOwn: boolean;
  outBidden: boolean;
}

export interface SaleRetrieveEvent {
  returnValues: {
    UserAddress: string;
    tokenID: string;
  };
}

export interface ResaleInfo {
  highestBid: string;
  bidderAddress: string;
  resalePrice: string;
  tokenID: string;
  resaleEndTime: string;
  sellerAddress: string;
}

export interface ResaleCreation {
  returnValues: {
    tokenID: string;
    resaleID: string;
    creationTime: string;
    resaleInfo: {
      resalePrice: string;
      resaleTime: string;
    }
  };
}

export interface StartResaleEvent {
  returnValues: {
    tokenId: string;
    resaleId: string;
    creationTime: string;
    resaleInfo: ResaleInfo;
  };
}

export interface ResaleRetrieve {
  returnValues: {
    tokenID: string;
    resaleID: string;
    previousOwner: string;
    newOwner: string;
  };
}

export interface CreateNft {
  name: string;
  location: LngLat;
  svg: string;
  price: string;
  tillDate: Date;
}

export type TransactionEventUnion = TransactionResultEvent | TransactionStartedEvent;
@Injectable()
export class ContractService {
  contractAddress = '0x7ad1182964274622Fd78Dd4adcAA3E8076129B40';
  blockNumber = 14600379;
  private loggedSubject = new BehaviorSubject<boolean>(false);
  logged$ = this.loggedSubject.asObservable();

  private walletInfoSubject = new BehaviorSubject<WalletInfo>(null);
  walletInfo$ = this.walletInfoSubject.asObservable();

  private errorSubject = new BehaviorSubject<string>('');
  error$ = this.errorSubject.asObservable();

  private nftsSubject = new BehaviorSubject<GeoNFT[]>([]);
  nfts$ = this.nftsSubject.asObservable().pipe(
    map(nfts => nfts.sort((a, b) => new Date(b.saleTime).getTime() - new Date(a.saleTime).getTime()),
    ));

  nftsOnSale$ = this.nftsSubject.asObservable().pipe(
    filter(x => !!x),
    map(nfts => {
      return nfts.filter(((nft) => {
        return nft.saleTime.getTime() > Date.now() && !nft.hasUserBids;
      }));
    }));
  nftNotSold$ = this.nftsSubject.asObservable().pipe(
    filter(x => !!x),
    map(nfts => {
      return nfts.filter(((nft) => {
        return nft.saleTime.getTime() > Date.now() && !(nft.ownerAddress);
      }));
    }));

  private ownedNFTsSubject = new BehaviorSubject<GeoNFT[]>(null);
  ownedNFTs$ = this.ownedNFTsSubject.asObservable();

  private transactionsSubject = new Subject<TransactionEventUnion>();
  transactions$ = this.transactionsSubject.asObservable();

  bidsMap = new Map<string, BidInfo[]>();
  bidsMapSubject = new BehaviorSubject<Map<string, BidInfo[]>>(new Map<string, BidInfo[]>());
  bidsMap$ = this.bidsMapSubject.asObservable();

  // resalesMap = new Map<string, ResaleInfo[]>();
  // resalesMapSubject = new BehaviorSubject<Map<string, ResaleInfo[]>>(new Map<string, ResaleInfo[]>());
  // resalesMap$ = this.resalesMapSubject.asObservable();

  newBidsSubject = new Subject<NftBidEvent>();
  newBids$ = this.newBidsSubject.asObservable();


  newNftsSubject = new Subject<MintTokenEvent>();
  newNfts$ = this.newNftsSubject.asObservable();

  contract: any;
  currentWeb3: any;
  wallet: any;
  selectedAddress: string;

  initializing = false;
  applyNftProcessing: boolean;

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
      await this.loadPassedEvents();
      this.setEvents();
      this.initializing = false;
      this.loggedSubject.next(true);
    } catch (error) {
      this.initializing = false;
      this.errorSubject.next(error);
      throw new Error(error);
    }
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
    this.contract.events.MintTokenEvent({})
      .on('data', async (nft: MintTokenEvent) => {
        console.log('nft created', nft);
        this.newNftsSubject.next(nft);
        const newGeoNftList = await this.applyMintNftEvent(this.nftsSubject.getValue(), nft);
        this.nftsSubject.next(newGeoNftList);
      });
    this.contract.events.StartResaleEvent({})
      .on('data', (startResaleEvent: StartResaleEvent) => {
        console.log('ResaleCreation', startResaleEvent);
        const nfts = this.nftsSubject.getValue();
        const [nft, nftIdx] = this.findNft(nfts, startResaleEvent.returnValues.tokenId);
        nfts[nftIdx] = this.applyStartResaleEventToNft(nft, startResaleEvent);
        this.nftsSubject.next(nfts);
      });
    this.contract.events.BidResaleEvent({})
      .on('data', (bidResaleEvent: BidResaleEvent) => {
        const nftId = bidResaleEvent.returnValues.tokenId;
        const nfts = this.nftsSubject.getValue();
        const [nft, nftIdx] = this.findNft(nfts, bidResaleEvent.returnValues.tokenId);
        nfts[nftIdx] = this.applyBidResaleEventToNft(nft, bidResaleEvent);
      });
    // TODO(xlhan)
  }

  findNft(nftList: GeoNFT[], targetTokenId: string) : [GeoNFT, number] {
    const nft = nftList.find(x => x.tokenId === targetTokenId);
    const nftIdx = nftList.findIndex(x => x.tokenId === targetTokenId);
    return [nft, nftIdx];
  }

  private epochToDate(epoch: string): Date {
    const date = new Date(0);
    const utcSeconds = Number(epoch);
    date.setUTCSeconds(utcSeconds);
    return date;
  }

  getSvg$(tokenId: number): Observable<SafeHtml> {
    const svgSub = new Subject();
    const svg$ = svgSub.asObservable();
    this.contract.methods
      .GetTokenSVG(tokenId).call({ from: this.selectedAddress })
      .then((svg: string) => {
        svgSub.next(this.domSanitizer.bypassSecurityTrustHtml(decodeURIComponent(svg)));
        svgSub.complete();
      });
    return svg$;
  }

  getSvg(tokenId: number): Promise<SafeHtml> {
    return this.contract.methods
      .GetTokenSVG(tokenId).call({ from: this.selectedAddress })
      .then((svg: string) => {
        return this.domSanitizer.bypassSecurityTrustHtml(decodeURIComponent(svg));
      });
  }

  getNftById(tokenId: number): GeoNFT {
    return this.nftsSubject.getValue().find(x => x.id === tokenId);
  }

  getNftById$(tokenId: number): Observable<GeoNFT> {
    return this.nfts$.pipe(map(nfts => nfts.find(x => x.id === tokenId)));
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

  bidNFT(tokenId: number, amount: string): void {
    // TODO: make it observable
    const result = this.contract.methods
      .Bid(tokenId)
      .send({ from: this.selectedAddress, value: amount });

    this.listenToTransaction(result);
  }

  bidResaleOld(resaleId: string, tokenId: string, amount: string): void {
    console.log('bidResale', resaleId, tokenId, amount);
    const transaction = this.contract.methods.bidResale(resaleId, tokenId).send({ from: this.selectedAddress, value: amount });
    this.listenToTransaction(transaction);
  }

  resaleNft(price: string, tokenId: string, resaleTime: number): void {
    // TODO: return transaction, push to resales events stream
    console.log('resale token', price, tokenId, 600);
    const result = this.contract.methods
      .putTokenForResale(price, tokenId, 600) // TODO: MOCKED 5mins!!
      .send({ from: this.selectedAddress });
    this.listenToTransaction(result);
  }

  private loadPassedEvents(): Promise<void> {
    return Promise.all([
      this.contract.getPastEvents('MintTokenEvent', { fromBlock: this.blockNumber }),
      this.contract.getPastEvents('StartResaleEvent', { fromBlock: this.blockNumber }),
      this.contract.getPastEvents('BidResaleEvent', { fromBlock: this.blockNumber }),
    ])
      .then(async ([
        mintTokenEvents,
        startResaleEvents,
        bidResaleEvents
      ]: [MintTokenEvent[], StartResaleEvent[], BidResaleEvent[]]) => {
        const blockNumbers = mintTokenEvents.map(e => e.blockNumber);
        blockNumbers.sort();
        console.log('Min block number: ' + blockNumbers[0]);
        // assign resales as bids here
        let nftList = [];
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < mintTokenEvents.length; i++) {
          nftList = await this.applyMintNftEvent(nftList, mintTokenEvents[i]);
        }
        for (const startResaleEvent of startResaleEvents) {
          const nftId = startResaleEvent.returnValues.tokenId;
          const nft = nftList.find(x => x.tokenId === nftId);
          const nftIdx = nftList.findIndex(x => x.tokenId === nftId);

          nftList[nftIdx] = this.applyStartResaleEventToNft(nft, startResaleEvent);
        }

        for (const bidResaleEvent of bidResaleEvents) {
          const nftId = bidResaleEvent.returnValues.tokenId;
          const nft = nftList.find(x => x.tokenId === nftId);
          const nftIdx = nftList.findIndex(x => x.tokenId === nftId);

          nftList[nftIdx] = this.applyBidResaleEventToNft(nft, bidResaleEvent);
        };
        // filter out nfts we can delete for sure
        // nftList = this.cleanupNfts(nftList);
        // const resaleRetrieve = resaleEvents[2] as ResaleRetir
        this.nftsSubject.next(nftList);
        // this.startNFTWatch();
      })
      .catch(e => {
        console.error(e);
      });
  }

  private cleanupNfts(nfts: GeoNFT[]): GeoNFT[] {
    return nfts.filter((nft: GeoNFT) => {
      return !(!nft.bidInfo && nft.saleTime.getTime() < Date.now() && !nft.ownerAddress);
    });
  }

  // as we're scanning whole history of contract events, "appliers" are desired way to load only newest state of nfts to RAM memory
  // limiting this resource usage by browser. Historical data should be lost or applied to GeoNFT entity in minimal way if needed on view

  // appliers can be used also on new events. Check which tokenID has an event, find GeoNFT and process it by respective to event applier
  // TODO:  refactor code to use that approach with all of events

  private async applyMintNftEvent(nftList: GeoNFT[], mintNftEvent: MintTokenEvent): Promise<GeoNFT[]> {
    if (this.applyNftProcessing) {
      return nftList;
    }
    this.applyNftProcessing = true;
    if (nftList.find(x => String(x.id) === mintNftEvent.returnValues.tokenId)) {
      this.applyNftProcessing = false;
      return nftList;
    }
    const geoNft = await this.mapMintTokenEventToGeoNFT(mintNftEvent);
    nftList.push(geoNft);
    this.applyNftProcessing = false;
    return nftList;
  }

  private applyStartResaleEventToNft(nft: GeoNFT, startResaleEvent: StartResaleEvent): GeoNFT {
    console.log('StartResaleEvent', startResaleEvent, Date.now());
    if (this.epochToDate(startResaleEvent.returnValues.resaleInfo.resaleEndTime).getTime() > Date.now()) {
      nft.status = SoldStatus.RESALE;
      // set price to new price
      nft.bidInfo = null;
      nft.sellerAddress = startResaleEvent.returnValues.resaleInfo.sellerAddress;
      nft.resalePrice = startResaleEvent.returnValues.resaleInfo.resalePrice;
      // console.log('resaleCreation', this.epochToDate(resaleCreation.returnValues.Info.resaleTime));
      nft.resaleEndTime = this.epochToDate(startResaleEvent.returnValues.resaleInfo.resaleEndTime);
      nft.resaleCreationTime = this.epochToDate(startResaleEvent.returnValues.creationTime);
      nft.resaleId = startResaleEvent.returnValues.resaleId;
    } else {
      nft.resaleId = startResaleEvent.returnValues.resaleId;
    }
    return nft;
  }

  private applyBidResaleEventToNft(nft: GeoNFT, bidResaleEvent: BidResaleEvent): GeoNFT {
    // set price to new price, set latest bidInfo to new bid
    if (bidResaleEvent.returnValues.latestInfo.bidderAddress.toLowerCase() === this.selectedAddress.toLowerCase()) {
      nft.hasUserBids = true;
    }
    nft.bidInfo = {
      bidderAddress: bidResaleEvent.returnValues.latestInfo.bidderAddress,
      highestBid: bidResaleEvent.returnValues.latestInfo.highestBid
    };
    return nft;
  }

  private applyResaleRetrieveToNft(nft: GeoNFT, resaleRetrieve: ResaleRetrieve): GeoNFT {
    // change owner to new owner, change status to "OWNED"
    nft.owner = resaleRetrieve.returnValues.newOwner.toLowerCase() === this.selectedAddress.toLowerCase();
    nft.ownerAddress = resaleRetrieve.returnValues.newOwner;
    nft.status = nft.owner ? SoldStatus.OWNED : SoldStatus.SOLD;
    return nft;
  }


  getOwnedNFTs$(): Observable<GeoNFT[]> {
    return this.nfts$.pipe(
      map(
        (nfts: GeoNFT[]) => {
          return nfts.filter(nft => {
            return nft.owner;
          });
        })
    );
  }

  refresh(): void {
    console.log('refreshing list');
    this.nftsSubject.next(this.cleanupNfts(this.nftsSubject.getValue()));
  }


  private async mapMintTokenEventToGeoNFT(nftCreation: MintTokenEvent): Promise<GeoNFT> {
    return new Promise(async (resolve, reject) => {
      try {
        const owner = await this.ownerOf(new Web3.utils.BN(nftCreation.returnValues.tokenId));
        const status = nftCreation.returnValues.tokenInfo.status;
        resolve({
          id: Number(nftCreation.returnValues.tokenId),
          tokenId: nftCreation.returnValues.tokenId,
          h3Key: this.tokenIdToH3Key(nftCreation.returnValues.tokenId),
          layer: Number(nftCreation.returnValues.tokenInfo.layer),
          ownerAddress: owner as string,
          owner: owner ? (owner as string).toLowerCase() === this.selectedAddress.toLowerCase() : false,
          saleTime: new Date(),
          creationTime: new Date(),
          sellerAddress: '',
          resalePrice: '',
          price: nftCreation.returnValues.tokenInfo.price,
          status: this.getStatus(status),
          location: new LngLat(122, 37),
          name: ''
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  getStatus(status: string) : SoldStatus {
    switch (status) {
      case '1':
        return SoldStatus.AVAILABLE;
      case '2':
        return SoldStatus.SOLD;
      case '3':
        return SoldStatus.RESALE;
    }
    return SoldStatus.UNAVAILABLE;
  }

  auctionInfo$(tokenID: number): Observable<BidInfo> {
    const bidSubject = new Subject<BidInfo>();
    const bid$ = bidSubject.asObservable();
    this.contract.methods.AuctionInfo(tokenID)
      .call({ from: this.selectedAddress })
      .then((bidInfo) => {
        bidSubject.next(bidInfo);
        bidSubject.complete();
      });
    return bid$;
  }

  auctionInfo(tokenID: number): Promise<BidInfo> {
    return this.contract.methods.AuctionInfo(tokenID)
      .call({ from: this.selectedAddress });
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

  getNftsWithMyBids$(): Observable<GeoNFT[]> {
    return this.nftsSubject.pipe(
      map((nfts: GeoNFT[]) => {
        return nfts.filter(x => (x.status === SoldStatus.AVAILABLE || x.status === SoldStatus.RESALE) &&
          (x.saleTime.getTime() > Date.now()) && x.hasUserBids && !x.owner);
      })
    );
  }

  getNftsToRetrieve$(): Observable<GeoNFT[]> {
    return this.nfts$.pipe(
      map(nfts => nfts.filter(nft => this.isReadyToRetrieve(nft))),
      tap(x => console.log('retrieve', x))
    );
  }

  canBid(nft: GeoNFT): boolean {
    return nft.resaleEndTime.getTime() > Date.now() &&
        nft.status == SoldStatus.RESALE;
  }

  isReadyToRetrieve(nft: GeoNFT): boolean {
    return nft.bidInfo && 
        nft.bidInfo.bidderAddress.toLowerCase() === this.selectedAddress.toLowerCase() &&
        nft.resaleEndTime.getTime() < Date.now() &&
        nft.status == SoldStatus.RESALE;
  }

  createNft(nft: CreateNft): void {
    const transaction = this.contract.methods.CreateNew(
      [[nft.name, `${nft.location.lat},${nft.location.lng}`, 1, this.oneToWei(String(nft.price)), 1]],
      [encodeURIComponent(nft.svg)],
      [Math.floor((nft.tillDate.getTime() - Date.now()) / 1000)]).send({ from: this.selectedAddress });
    this.listenToTransaction(transaction);
  }

  mintToken(h3Key: String): void {
    const transaction = this.contract.methods
      .mintToken(this.h3KeyToTokenId(h3Key), 1)
      .send({ 
        from: this.selectedAddress, 
        value: new Web3.utils.BN(this.oneToWei('1'))});
    this.listenToTransaction(transaction);
  }

  startResale(h3Key: String, priceOne: number, secondsAfter: number): void {
    const transaction = this.contract.methods
      .startResale(new Web3.utils.BN(this.oneToWei(priceOne.toString())), 
          this.h3KeyToTokenId(h3Key), secondsAfter)
      .send({ from: this.selectedAddress });
    this.listenToTransaction(transaction);
  }

  bidResale(h3Key: String, resaleId: string, priceOne: number): void {
    const transaction = this.contract.methods
      .bidResale(resaleId, this.h3KeyToTokenId(h3Key))
      .send({ from: this.selectedAddress, value: this.oneToWei(priceOne.toString())});
    this.listenToTransaction(transaction);
  }

  retrieveTokenFromResale(h3Key: String, resaleId: string): void {
    const transaction = this.contract.methods
      .retrieveTokenFromResale(resaleId, this.h3KeyToTokenId(h3Key))
      .send({ from: this.selectedAddress});
    this.listenToTransaction(transaction);
  }

  async getTokenAndResaleInfos(h3Keys: String[]) {
    const tokenIds = h3Keys.map(k => this.h3KeyToTokenId(k));
    const result = await this.contract.methods
      .getTokenAndResaleInfos(tokenIds)
      .send({ from: this.selectedAddress });
    console.log(result);
  }

  h3KeyToTokenId(h3Key: String) : string {
    return BigInt('0x' + h3Key).toString();
  }

  tokenIdToH3Key(tokenId: string) {
    return BigInt(tokenId).toString(16)
  }

  enableResalePermission(): void {
    const transaction = this.contract.methods
      .enableResale()
      .send({ from: this.selectedAddress });
    this.listenToTransaction(transaction);
  }

  disableResalePermission(): void {
    const transaction = this.contract.methods
      .disableResale()
      .send({ from: this.selectedAddress });
    this.listenToTransaction(transaction);
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

  retrieveNFTs(tokenIds: string[]): void {
    const transaction = this.contract.methods.RetrieveNFT(tokenIds).send({ from: this.selectedAddress });
    this.listenToTransaction(transaction);
  }


  /**
   * TODO: retrieve many NFTs at once
   * @param tokenId
   */
  retrieveResaleNFT(resaleId: string[], tokenId: string[]): void {
    const transaction = this.contract.methods.RetrieveReSale(resaleId, tokenId).send({ from: this.selectedAddress });
    this.listenToTransaction(transaction);
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
    this.nftsSubject.next([]);
    this.ownedNFTsSubject.next([]);
    this.loggedSubject.next(false);
    window.localStorage.removeItem('wasStarted');

  }

}
