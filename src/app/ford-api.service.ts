import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Car {
  id: number;
  make: string | null;
  model: string | null;
  variant: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  engineFuelType: string | null;
  enginePowerBhp: number | null;
  enginePowerKw: number | null;
  gearboxType: string | null;
  gears: number | null;
  drivetrain: string | null;
  topSpeedKph: number | null;
  fuelTankLitres: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
}

export interface CarRecommendation extends Car {
  similarity: number;
}

export interface CarList {
  total: number;
  skip: number;
  limit: number;
  items: Car[];
}

@Injectable({
  providedIn: 'root',
})
export class FordApiService {
  private http = inject(HttpClient);

  private readonly baseUrl = 'https://api-ford-linux-dkh6bkatgzbndddg.southafricanorth-01.azurewebsites.net';

  listCars(filtros: { make?: string; model?: string; skip?: number; limit?: number } = {}): Observable<CarList> {
    let params = new HttpParams();
    if (filtros.make) params = params.set('make', filtros.make);
    if (filtros.model) params = params.set('model', filtros.model);
    if (filtros.skip !== undefined) params = params.set('skip', filtros.skip);
    if (filtros.limit !== undefined) params = params.set('limit', filtros.limit);

    return this.http.get<CarList>(`${this.baseUrl}/cars`, { params });
  }

  getCar(carId: number): Observable<Car> {
    return this.http.get<Car>(`${this.baseUrl}/cars/${carId}`);
  }

  getRecomendacoes(carId: number, limit = 5): Observable<CarRecommendation[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<CarRecommendation[]>(`${this.baseUrl}/cars/${carId}/recommendations`, { params });
  }
}
