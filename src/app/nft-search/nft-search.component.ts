import { Component, OnInit } from '@angular/core';
import {Apollo, gql} from 'apollo-angular';

const SEARCH_BY_NICKNAME_QUERY = `
query SearchByNickName($nickname: String!) {
  tokens (where: {nickname: $nickname}) {
    id,
    status,
    price,
    owner,
    nickname,
    resaleInfo {
      bidAskPrice,
      buyNowPrice
    }
  }
}
`;

@Component({
  selector: 'app-nft-search',
  templateUrl: './nft-search.component.html',
  styleUrls: ['./nft-search.component.scss']
})
export class NftSearchComponent implements OnInit {

  constructor(public apollo: Apollo) { }

  ngOnInit(): void {
  }

  search(): void {
    this.apollo.query({
      query: gql(SEARCH_BY_NICKNAME_QUERY),
      variables: {
        nickname: "test",
      },
    })
    .subscribe((result: any) => {
      console.log(result.data.tokens);
    });
    
  }

}
