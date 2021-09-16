import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TransactionResultComponent } from './transaction-result/transaction-result.component';

const routes: Routes = [
  {
    path: '*',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    component: TransactionResultComponent,
    path: 'transaction-result',
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
