import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

export interface LatLng {
    lat: number;
    lon: number;
}

@Injectable({ providedIn: 'root' })
export class RouteDistanceService {
    private cache = new Map<string, Observable<number>>();
    private apiKey = environment.openRouteServiceApiKey;

    constructor(private http: HttpClient) { }

    getDrivingDistance(from: LatLng, to: LatLng): Observable<number> {
        const key = `${from.lat},${from.lon}|${to.lat},${to.lon}`;
        if (this.cache.has(key)) {
            return this.cache.get(key)!;
        }
        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${this.apiKey}&start=${from.lon},${from.lat}&end=${to.lon},${to.lat}`;
        const obs = this.http.get<any>(url).pipe(
            map(res => res.routes?.[0]?.summary?.distance ?? Infinity), // meters
            catchError(() => of(Infinity)),
            shareReplay(1)
        );
        this.cache.set(key, obs);
        return obs;
    }
}
