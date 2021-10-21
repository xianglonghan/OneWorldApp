// @ts-nocheck
import {
  Component,
  OnChanges,
  OnDestroy,
  QueryList,
  SimpleChanges,
  ViewChildren,
} from '@angular/core';
import { LngLatBounds, Map as MglMap} from 'mapbox-gl';
import { h3ToGeoBoundary, polyfill } from 'h3-js';
import { MarkerComponent } from 'ngx-mapbox-gl/lib/marker/marker.component';
import { fromEvent, Subscription, timer } from 'rxjs';
import { GeoNFT, TokenStatus, ContractService } from '../services/contract.service';
import { MapHelperService } from './../services/map-helper.service';

@Component({
  selector: 'app-map-gl',
  templateUrl: './map-gl.component.html',
  styleUrls: ['./map-gl.component.scss'],
})
export class MapGlComponent implements OnChanges, OnDestroy {
  public bounds: LngLatBounds;
  public map: MglMap;
  nfts: GeoNFT[];
  h3KeyToNft: Map<string, GeoNFT>
  subscriptions = [];
  @ViewChildren('markers') public markerViews: QueryList<MarkerComponent>;
  constructor(
    private mapHelperService: MapHelperService,
    public contractService: ContractService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
  }

  async onMapLoaded($event): void {
    this.map = $event;
    this.map.setStyle('mapbox://styles/mapbox/dark-v10');

    const bounds = this.map.getBounds();
    await this.loadNftsForBounds(bounds);

    const h3Source = 'h3';
    const h3BaseLayerId = 'h3-base';
    const h3OnMarketLayerId = 'h3-on-market';
    const h3OffMarketLayerId = 'h3-off-market';
    const h3OwnedLayerId = 'h3-owned';
    const h3HighlightedLayerId = 'h3-highlighted';
    this.map.addSource(h3Source, {
      type: 'geojson',
      data: this.getH3GeojsonForBounds(bounds)
    });
    this.map.addLayer({
      'id': h3BaseLayerId,
      'type': 'fill',
      'source': h3Source, // reference the data source
      'layout': {},
      'paint': {
        'fill-color': '#00ff00', // blue color fill
        'fill-opacity': 0.1
      },
    });
    // Add a new layer to visualize the polygon.
    this.map.addLayer({
      'id': h3OnMarketLayerId,
      'type': 'fill',
      'source': h3Source, // reference the data source
      'layout': {},
      'paint': {
        'fill-color': '#00ff00', // blue color fill
        'fill-opacity': 0.3
      },
      'filter': ['in', 'h3Key', '']
    });
    this.map.addLayer({
      'id': h3OffMarketLayerId,
      'type': 'fill',
      'source': h3Source, // reference the data source
      'layout': {},
      'paint': {
        'fill-color': '#ff0000', // blue color fill
        'fill-opacity': 0.3
      },
      'filter': ['in', 'h3Key', '']
    });
    this.map.addLayer({
      'id': h3OwnedLayerId,
      'type': 'line',
      'source': h3Source, // reference the data source
      'layout': {},
      'paint': {
        'line-color': '#000',
        'line-width': 3
      },
      'filter': ['in', 'h3Key', '']
    });
    this.map.addLayer({
      'id': h3HighlightedLayerId,
      'type': 'fill',
      'source': h3Source, // reference the data source
      'layout': {},
      'paint': {
        'fill-color': '#6e599f', // blue color fill
        'fill-opacity': 0.5
      },
      'filter': ['in', 'h3Key', '']
    });

    this.subscriptions.push(
      this.contractService.nfts$.subscribe((nfts) => {
        this.nfts = nfts;
        this.h3KeyToNft = new Map();
        for (const nft of this.nfts) {
          this.h3KeyToNft.set(nft.h3Key, nft);
        }
        const offMarketH3Keys = this.nfts.filter(
            nft => nft.status == TokenStatus.HOLD).map(nft => nft.h3Key);
        const onMarketH3Keys = this.nfts.filter(
            nft => nft.status == TokenStatus.RESALE).map(nft => nft.h3Key);
        const ownedH3Keys = this.nfts.filter(nft => nft.owner).map(nft => nft.h3Key);
        this.map.setFilter(h3OnMarketLayerId, ['in', 'h3Key', ...onMarketH3Keys]);
        this.map.setFilter(h3OffMarketLayerId, ['in', 'h3Key', ...offMarketH3Keys]);
        this.map.setFilter(h3OwnedLayerId, ['in', 'h3Key', ...ownedH3Keys]);
      })
    );

    this.map.on('dragend', () => {
      const bounds = this.map.getBounds();
      const newH3Data = this.getH3GeojsonForBounds(bounds);
      this.map.getSource(h3Source).setData(newH3Data);
      this.loadNftsForBounds(bounds);
    });
    this.map.on('zoomend', () => {
      const bounds = this.map.getBounds();
      const newH3Data = this.getH3GeojsonForBounds(bounds);
      this.map.getSource(h3Source).setData(newH3Data);
      this.loadNftsForBounds(bounds);
    });
    this.map.on('click', (e) => {
      // Set `bbox` as 5px reactangle area around clicked point.
      const bbox = [
        [e.point.x - 5, e.point.y - 5],
        [e.point.x + 5, e.point.y + 5]
      ];
      // Find features intersecting the bounding box.
      const selectedFeatures = this.map.queryRenderedFeatures(bbox, {
        layers: [h3BaseLayerId]
      });
      if (selectedFeatures.length > 0) {
        const previousH3Key = this.mapHelperService.mapH3KeySelectedSubject.getValue();
        const h3Key = selectedFeatures[0].properties.h3Key;
        if (previousH3Key != h3Key) {
          this.map.setFilter(h3HighlightedLayerId, ['in', 'h3Key', h3Key]);
          this.mapHelperService.selecteH3Key(h3Key);
        } else {
          this.map.setFilter(h3HighlightedLayerId, ['in', 'h3Key', '']);
          this.mapHelperService.selecteH3Key('');
        }
      }
    });
  }

  async loadNftsForBounds(bounds: LngLatBounds): any {
    const h3Keys = this.getH3KeysForBounds(bounds);
    await this.contractService.loadNfts(h3Keys);
  }

  getH3GeojsonForBounds(bounds: LngLatBounds): any {
    // TODO(xlhan): buffer the bounds
    const h3Keys = this.getH3KeysForBounds(bounds);
    const h3Infos = [];
    for (const h3Key of h3Keys) {
      h3Infos.push({
        h3Key: h3Key,
        geometry: h3ToGeoBoundary(h3Key)
      });
    }
    return this.h3PolygonsToGeoJson(h3Infos);
  }

  getH3KeysForBounds(bounds: LngLatBounds): string[] {
    return polyfill(
      [[bounds.getNorthEast().lat, bounds.getNorthEast().lng],
      [bounds.getSouthEast().lat, bounds.getSouthEast().lng],
      [bounds.getSouthWest().lat, bounds.getSouthWest().lng],
      [bounds.getNorthWest().lat, bounds.getNorthWest().lng]],
      9
    );
  }

  h3PolygonsToGeoJson(h3Infos: object[]): any {
    const featureGeoJsons = [];
    for (const h3Info of h3Infos) {
      const coords = h3Info.geometry.map(latLng => [latLng[1], latLng[0]]);
      coords.push(coords[0]);
      featureGeoJsons.push({
        'type': 'Feature',
        'geometry': {
          'type': 'Polygon',
          'coordinates': [coords]
        },
        'properties': {
          'h3Key': h3Info.h3Key
        }
      });
    }
    return {
      "type": "FeatureCollection",
      "features": featureGeoJsons
    };
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub: Subscription) => {
      sub.unsubscribe();
    });
  }
}
