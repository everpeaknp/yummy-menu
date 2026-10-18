export interface BrowserLocation {
  latitude: number;
  longitude: number;
  accuracy_meters: number;
}

export const getTableActionLocation = (): Promise<BrowserLocation> => {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(new Error("Location is not available on this device."));
  }
  return new Promise((resolve, reject) => {
    const geolocation = navigator.geolocation;
    let best: BrowserLocation | undefined;
    let watchId: number | undefined;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (watchId !== undefined) geolocation.clearWatch(watchId);
      if (error) reject(error);
      else if (best) resolve(best); // The server remains authoritative about accuracy and distance.
      else reject(new Error("Could not get your location. Check location permissions and retry. Your draft is saved."));
    };
    const timer = setTimeout(() => finish(), 12_000);
    watchId = geolocation.watchPosition(
      ({ coords }) => {
        if (settled || !Number.isFinite(coords.accuracy) || coords.accuracy < 0
          || !Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return;
        if (!best || coords.accuracy < best.accuracy_meters) {
          best = { latitude: coords.latitude, longitude: coords.longitude, accuracy_meters: coords.accuracy };
        }
        // Wait for improvements to coarse readings instead of rejecting the first fix.
        if (best.accuracy_meters <= 100) finish();
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          finish(new Error("Location access is blocked. Allow location in your browser and device settings, then retry. Your draft is saved."));
        }
        // Unavailable/timeout readings can recover while the overall timer is running.
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
    if (settled) geolocation.clearWatch(watchId);
  });
};
