import { NgxMatNativeDateModule, NgxMatTimepickerModule } from '@angular-material-components/datetime-picker';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxFileDropModule } from 'ngx-file-drop';
import { MapService, NgxMapboxGLModule } from 'ngx-mapbox-gl';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CurtainComponent } from './curtain/curtain.component';
import { DialogComponent } from './dialog/dialog.component';
import { MapGlComponent } from './map-gl/map-gl.component';
import { ShortAddressPipe } from './pipes/short-address.pipe';
import { WeiToOnePipe } from './pipes/wei-to-one.pipe';
import { ContractService } from './services/contract.service';
import { DeviceDetectorService } from './services/device-detector.service';
import { GeolocationService } from './services/geolocation-service.service';
import { PriceConverterService } from './services/price-converter.service';
import { SVGGeneratorService } from './services/svggenerator.service';
import { TransactionResultComponent } from './transaction-result/transaction-result.component';
import { ButtonComponent } from './ux-components/button/button.component';
import { DatePickerComponent } from './ux-components/date-picker/date-picker.component';
import { FormFieldComponent } from './ux-components/form-field/form-field.component';
import { InputComponent } from './ux-components/input/input.component';
import { LoadingButtonComponent } from './ux-components/loading-button/loading-button.component';
import { PricePickerComponent } from './ux-components/price-picker/price-picker.component';
import { SelectionControlsComponent } from './ux-components/selection-controls/selection-controls.component';
import { TextareaComponent } from './ux-components/textarea/textarea.component';
import { WalletComponent } from './wallet/wallet.component';
import { NftMainComponent } from './nft-main/nft-main.component';
import { MyNftsComponent } from './my-nfts/my-nfts.component';
import { NftSearchComponent } from './nft-search/nft-search.component';
import {APOLLO_OPTIONS} from 'apollo-angular';
import {HttpLink} from 'apollo-angular/http';
import {InMemoryCache} from '@apollo/client/core';
import { NftPriceTagComponent } from './nft-price-tag/nft-price-tag.component';


@NgModule({
  declarations: [
    AppComponent,
    DialogComponent,
    MapGlComponent,
    WalletComponent,
    ShortAddressPipe,
    CurtainComponent,
    TransactionResultComponent,
    WeiToOnePipe,
    LoadingButtonComponent,
    ButtonComponent,
    PricePickerComponent,
    DatePickerComponent,
    SelectionControlsComponent,
    InputComponent,
    FormFieldComponent,
    TextareaComponent,
    NftMainComponent,
    MyNftsComponent,
    NftSearchComponent,
    NftPriceTagComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    MatSidenavModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatTabsModule,
    MatIconModule,
    MatToolbarModule,
    MatDialogModule,
    MatListModule,
    MatChipsModule,
    MatInputModule,
    MatSnackBarModule,
    MatButtonToggleModule,
    MatProgressBarModule,
    NgxMapboxGLModule.withConfig({
      accessToken:
        'pk.eyJ1IjoidGhlY3liZXJkM20wbiIsImEiOiJja2FpcnNyeXowM21tMndwamxyZjU5ajJpIn0.TjWqQxlCdOZmoVFLFJBRsA', // Optional, can also be set per map (accessToken input of mgl-map)
    }),
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatCardModule,
    FormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    NgxMatNativeDateModule,
    NgxMatTimepickerModule,
    NgxFileDropModule,
    ReactiveFormsModule
  ],
  providers: [
    GeolocationService,
    MapService,
    SVGGeneratorService,
    ContractService,
    DeviceDetectorService,
    PriceConverterService,
    {
      provide: APOLLO_OPTIONS,
      useFactory: (httpLink: HttpLink) => {
        return {
          cache: new InMemoryCache(),
          link: httpLink.create({
            uri: 'http://localhost:8000/subgraphs/name/harmony/one-world',
          }),
        };
      },
      deps: [HttpLink],
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
