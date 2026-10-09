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
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy_meters: coords.accuracy,
      }),
      (error) => reject(new Error(
        error.code === error.PERMISSION_DENIED
          ? "Allow precise location to order from this table."
          : "We could not confirm that you are at the restaurant. Try again.",
      )),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  });
};
