// https://docs.mapbox.com/help/tutorials/find-elevations-with-tilequery-api/
import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

const token = process.env.NEXT_PUBLIC_API_TOKEN;
// A NavigationControl control contains zoom buttons and a compass
mapboxgl.accessToken = token;

// https://earthquake.usgs.gov/fdsnws/event/1/[METHOD[?PARAMETERS]]

const MapElevationFinder = () => {
  //
  const map = useRef(null);
  const mapContainer = useRef(null);
  //

  useEffect(() => {
    if (map.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [30.540297, 50.442771], // starting position
      zoom: 11,
    });
    //

    //
    map.current.on("load", () => {
      map.current.addControl(new mapboxgl.NavigationControl(), "bottom-left");
      map.current.addControl(new mapboxgl.FullscreenControl());

      // set the bounds of the map
      const bounds = [
        [30.529434, 50.435619],
        [30.550857, 50.453392],
      ];
      map.current.setMaxBounds(bounds);
    });
  }, []);

  useEffect(() => {
    const lngDisplay = document.getElementById("lng");
    const latDisplay = document.getElementById("lat");
    const eleDisplay = document.getElementById("ele");
    // Create constants for the latitude and longitude.
    let lng;
    let lat;

    map.current.on("load", () => {
      map.current.on("click", (event) => {
        const marker = new mapboxgl.Marker({
          color: "#314ccd",
        });
        // Use the returned LngLat object to set the marker location
        // https://docs.mapbox.com/mapbox-gl-js/api/#lnglat
        marker.setLngLat(event.lngLat).addTo(map.current);

        lng = event.lngLat.lng;
        lat = event.lngLat.lat;

        async function getElevation() {
          // Construct the API request.
          const query = await fetch(
            `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${lng},${lat}.json?layers=contour&limit=50&access_token=${token}`,
            { method: "GET" }
          );
          if (query.status !== 200) return;
          const data = await query.json();
          // Display the longitude and latitude values.
          lngDisplay.textContent = lng.toFixed(2);
          latDisplay.textContent = lat.toFixed(2);
          // Get all the returned features.
          const allFeatures = data.features;
          // For each returned feature, add elevation data to the elevations array.
          const elevations = allFeatures.map((feature) => feature.properties.ele);
          // In the elevations array, find the largest value.
          const highestElevation = Math.max(...elevations);
          // Display the largest elevation value.
          eleDisplay.textContent = `${highestElevation} meters`;
        }

        getElevation();
      });
    });
  }, []);

  return (
    <>
      <div ref={mapContainer} className="w-screen h-screen relative" />
      <div
        className="absolute left-5 top-8 max-h-fit w-[30%] border-2 border-blue-600
    bg-slate-100 p-4 text-start"
      >
        <div>
          <strong>Longitude:</strong> <span id="lng"></span>
        </div>
        <div>
          <strong>Latitude:</strong> <span id="lat"></span>
        </div>
        <div>
          <strong>Elevation:</strong> <span id="ele"></span>
        </div>
      </div>
    </>
  );
};

export default MapElevationFinder;
