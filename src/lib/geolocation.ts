export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface Address {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  formatted?: string;
}

export interface Place {
  id: string;
  name: string;
  address: Address;
  coordinates: Coordinates;
  distance?: number;
}

export class GeolocationService {
  private apiKey: string = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  async getCurrentPosition(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(new Error(error.message));
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    });
  }

  async watchPosition(
    onSuccess: (coordinates: Coordinates) => void,
    onError?: (error: string) => void
  ): Promise<number> {
    return navigator.geolocation.watchPosition(
      (position) => {
        onSuccess({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        if (onError) onError(error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }

  clearWatch(watchId: number): void {
    navigator.geolocation.clearWatch(watchId);
  }

  async geocode(address: string): Promise<Coordinates> {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${this.apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results[0]) {
      throw new Error('Geocoding failed');
    }

    const location = data.results[0].geometry.location;
    return {
      latitude: location.lat,
      longitude: location.lng,
    };
  }

  async reverseGeocode(coordinates: Coordinates): Promise<Address> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.latitude},${coordinates.longitude}&key=${this.apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results[0]) {
      throw new Error('Reverse geocoding failed');
    }

    const result = data.results[0];
    const components = result.address_components;

    return {
      street: this.getAddressComponent(components, 'route'),
      city: this.getAddressComponent(components, 'locality'),
      postalCode: this.getAddressComponent(components, 'postal_code'),
      country: this.getAddressComponent(components, 'country'),
      formatted: result.formatted_address,
    };
  }

  async searchNearby(
    coordinates: Coordinates,
    type: string,
    radius: number = 5000
  ): Promise<Place[]> {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coordinates.latitude},${coordinates.longitude}&radius=${radius}&type=${type}&key=${this.apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error('Nearby search failed');
    }

    return (data.results as Array<{ place_id: string; name: string; vicinity: string; geometry: { location: { lat: number; lng: number } } }>).map((place) => ({
      id: place.place_id,
      name: place.name,
      address: {
        formatted: place.vicinity,
      },
      coordinates: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      },
    }));
  }

  async autocomplete(input: string, location?: Coordinates): Promise<Place[]> {
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${this.apiKey}`;

    if (location) {
      url += `&location=${location.latitude},${location.longitude}&radius=50000`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return [];
    }

    return (data.predictions as Array<{ place_id: string; description: string }>).map((prediction) => ({
      id: prediction.place_id,
      name: prediction.description,
      address: {
        formatted: prediction.description,
      },
      coordinates: { latitude: 0, longitude: 0 },
    }));
  }

  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371;
    const dLat = this.toRad(coord2.latitude - coord1.latitude);
    const dLon = this.toRad(coord2.longitude - coord1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(coord1.latitude)) *
        Math.cos(this.toRad(coord2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  private getAddressComponent(components: Array<{ types: string[]; long_name: string }>, type: string): string | undefined {
    const component = components.find((c) => c.types.includes(type));
    return component?.long_name;
  }

  async getMapImageUrl(
    coordinates: Coordinates,
    width: number = 600,
    height: number = 400,
    zoom: number = 15
  ): Promise<string> {
    return `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.latitude},${coordinates.longitude}&zoom=${zoom}&size=${width}x${height}&markers=color:red%7C${coordinates.latitude},${coordinates.longitude}&key=${this.apiKey}`;
  }
}

export const geolocation = new GeolocationService();
