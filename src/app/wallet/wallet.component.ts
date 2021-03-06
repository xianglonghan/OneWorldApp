import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { filter, switchMap, tap } from 'rxjs/operators';
import { ContractService, WalletInfo } from './../services/contract.service';
import { DeviceDetectorService } from './../services/device-detector.service';
import { PriceConverterService } from './../services/price-converter.service';
import { UxService } from './../services/ux.service';

@Component({
  selector: 'app-wallet',
  templateUrl: './wallet.component.html',
  styleUrls: ['./wallet.component.scss']
})
export class WalletComponent implements OnInit {
  isMobile = !this.deviceDetectorService.isDesktop();
  balance: number;
  convertedBalance: string;
  walletInfo: WalletInfo;
  enableSales: boolean;
  isAdmin: boolean;
  nftsWithBids = [];
  constructor(
    public uxService: UxService,
    private deviceDetectorService: DeviceDetectorService,
    public contractService: ContractService,
    public priceConverter: PriceConverterService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.contractService.walletInfo$.pipe(
      filter(x => !!x),
      tap(walletInfo => this.walletInfo = walletInfo),
      switchMap(walletInfo => this.priceConverter.convertOneToUSDT(Number(walletInfo.balance)))
    ).subscribe((convertedBalance: number) => {
      this.convertedBalance = convertedBalance.toFixed(2);
      this.loadSalesStatus();
    });
  }

  loadSalesStatus(): void {
    this.contractService.isApprovedForAll().then((result) => {
      this.enableSales = result;
    }).catch(e => {
      console.error(e);
    });
  }

  toggleSales(): void {
    if (!this.enableSales) {
    } else {
    }
  }

  getBalanceNumber(): string {
    return Number(this.walletInfo.balance).toFixed(1);
  }

  async logout(): Promise<void> {
    await this.router.navigate(['/']);
    this.contractService.logout();
  }

}
