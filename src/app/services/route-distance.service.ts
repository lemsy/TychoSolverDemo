import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of, from, Subject } from 'rxjs';
import { map, catchError, shareReplay, concatMap } from 'rxjs/operators';

export interface LatLng {
    lat: number;
    lon: number;
}

@Injectable({ providedIn: 'root' })
export class RouteDistanceService {
    private cache = new Map<string, Observable<number>>();
    private apiKey = environment.openRouteServiceApiKey;

    // Throttling: queue requests, max 1 per 300ms
    private requestQueue = new Subject<() => void>();

    constructor(private http: HttpClient) {
        // Start processing the queue
        this.requestQueue.pipe(
            concatMap(fn => from(new Promise<void>(resolve => {
                fn();
                setTimeout(resolve, 300); // 1 request per 300ms
            })))
        ).subscribe();
    }

    getDrivingDistance(from: LatLng, to: LatLng): Observable<number> {
        const key = `${from.lat},${from.lon}|${to.lat},${to.lon}`;
        if (this.cache.has(key)) {
            return this.cache.get(key)!;
        }
        let resolver: ((value: number) => void) | null = null;
        const obs = new Observable<number>(subscriber => {
            resolver = (value: number) => {
                subscriber.next(value);
                subscriber.complete();
            };
            this.requestQueue.next(() => {
                const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${this.apiKey}&start=${from.lon},${from.lat}&end=${to.lon},${to.lat}`;
                this.http.get<any>(url).pipe(
                    map(res => res.routes?.[0]?.summary?.distance ?? Infinity),
                    catchError(() => of(Infinity))
                ).subscribe({
                    next: value => resolver && resolver(value),
                    error: () => resolver && resolver(Infinity)
                });
            });
        }).pipe(shareReplay(1));
        this.cache.set(key, obs);
        return obs;
    }
}
