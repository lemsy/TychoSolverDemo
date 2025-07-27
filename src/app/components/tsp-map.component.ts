import { Component, ElementRef, OnInit, AfterViewInit, ViewChild, Input, SimpleChanges, OnChanges } from '@angular/core';
import * as L from 'leaflet';

// Custom SVG icon for markers
const svgIcon = L.divIcon({
    className: '',
    html: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'>
    <circle cx='10' cy='10' r='6' fill='#2a93d5' stroke='#fff' stroke-width='2'/>
    <circle cx='10' cy='10' r='3' fill='#fff' stroke='#2a93d5' stroke-width='1.2'/>
  </svg>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
    tooltipAnchor: [0, -10]
});



@Component({
    selector: 'app-tsp-map',
    standalone: true,
    template: `<div class="tsp-map-container"><div #leafletMap></div></div>`,
    styleUrl: './tsp-map.component.css'
})
export class TSPMapComponent implements OnInit, AfterViewInit, OnChanges {
    @Input() showLabels: boolean = true; // Show labels for random cities, hide for Spain cities
    @ViewChild('leafletMap', { static: true }) mapContainer!: ElementRef;
    @Input() cities: { name: string, lat: number, lng: number }[] = [];
    @Input() tour: number[] = [];

    private map!: L.Map;
    private markers: L.Marker[] = [];
    private polyline?: L.Polyline;
    private mapReady: boolean = false;
    // private hasRendered: boolean = false; // Commented out to allow multiple renders

    ngOnInit() { }

    ngAfterViewInit() {
        this.initMap();
        this.mapReady = true;
        // Do not call renderCitiesAndTour here; let ngOnChanges handle it after map is ready
    }

    private lastCitiesRef: any = null;
    private lastTourRef: any = null;
    private lastCitiesLength: number = 0;
    private lastTourLength: number = 0;

    ngOnChanges(changes: SimpleChanges) {
        if (!this.mapReady) return;
        let shouldRender = false;
        if (changes['cities']) {
            if (changes['cities'].previousValue !== changes['cities'].currentValue ||
                (Array.isArray(this.cities) && this.cities.length !== this.lastCitiesLength)) {
                shouldRender = true;
                this.lastCitiesRef = this.cities;
                this.lastCitiesLength = this.cities.length;
            }
        }
        if (changes['tour']) {
            if (changes['tour'].previousValue !== changes['tour'].currentValue ||
                (Array.isArray(this.tour) && this.tour.length !== this.lastTourLength)) {
                shouldRender = true;
                this.lastTourRef = this.tour;
                this.lastTourLength = this.tour.length;
            }
        }
        if (shouldRender) {
            this.renderCitiesAndTour();
            // this.hasRendered = true; // Commented out to allow multiple renders
        }
    }

    private initMap() {
        this.map = L.map(this.mapContainer.nativeElement, {
            center: [40.4168, -3.7038],
            zoom: 6,
            minZoom: 5,
            maxZoom: 7,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false,
            zoomControl: false,
            touchZoom: false,
            attributionControl: true
        });
        // Restrict map bounds to Spain
        const spainBounds = L.latLngBounds([
            [35.5, -10], // Southwest
            [44.5, 5]    // Northeast
        ]);
        this.map.setMaxBounds(spainBounds);
        this.map.on('drag', () => {
            this.map.panInsideBounds(spainBounds, { animate: false });
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        // Map initialized
    }

    private renderCitiesAndTour() {
        if (!this.map) return;
        //
        // Remove old markers and polyline
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];
        if (this.polyline) {
            this.map.removeLayer(this.polyline);
            this.polyline = undefined;
        }
        // Render markers for all cities if present
        if (this.cities && this.cities.length > 0) {
            for (let i = 0; i < this.cities.length; i++) {
                let city = this.cities[i];
                const marker = L.marker([city.lat, city.lng], { icon: svgIcon })
                    .addTo(this.map);
                if (this.showLabels) {
                    marker.bindTooltip(city.name, { permanent: true });
                }
                this.markers.push(marker);
            }
        }
        // Draw tour polyline if tour is provided and valid (after markers)
        if (this.cities && this.cities.length > 0 && this.tour && this.tour.length > 1) {
            const tourLatLngs: [number, number][] = this.tour.map(idx => [this.cities[idx].lat, this.cities[idx].lng]);
            tourLatLngs.push(tourLatLngs[0]); // Always close the loop
            this.polyline = L.polyline(tourLatLngs, { color: '#2a93d5', weight: 2, opacity: 0.8 }).addTo(this.map);
        }
    }
}
