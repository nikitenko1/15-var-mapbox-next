// https://docs.mapbox.com/help/tutorials/local-search-geocoding-api/
import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";

const token = process.env.NEXT_PUBLIC_API_TOKEN;
// A NavigationControl control contains zoom buttons and a compass
mapboxgl.accessToken = token;

export const generateNewMarker = ({ lat, lng, map }) => {
  const popUp = new mapboxgl.Popup({ closeButton: false, anchor: "left" }).setHTML(
    `<div className="popup">You click here: <br/>[${lng}, ${lat}]</div>`
  );
  new mapboxgl.Marker({ color: "#63df29", scale: 1.5 }) // initialize a new marker
    .setLngLat([lng, lat]) // Marker [lng, lat] coordinates
    .setPopup(popUp)
    .addTo(map); // Add the marker to the map
};

export const geocoder =
  // Initialize the geocoder
  new MapboxGeocoder({
    accessToken: token, // Set the access token
    placeholder: "Search for places in Kyiv", // Placeholder text for the search bar
    mapboxgl: mapboxgl, // Set the mapbox-gl instance
    marker: false, // Do not use the default marker style
    // you will not receive any results outside of the bounding box
    bbox: [29.26325, 49.187752, 32.178986, 51.564295], // Boundary for Kyiv
    proximity: {
      longitude: 31.441921,
      latitude: 50.359199,
    }, // Coordinates of Kyiv
  });

export const customMarker = (map) => {
  map.current.addSource("single-point", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
  });

  map.current.addLayer({
    id: "point",
    source: "single-point",
    type: "circle",
    paint: {
      "circle-radius": 10,
      "circle-color": "#448ee4",
    },
  });
};

const MapViewGecoder = () => {
  //
  const map = useRef(null);
  const mapContainer = useRef(null);
  //

  const [zoom] = useState(13);

  useEffect(() => {
    if (map.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [30.53608, 50.496656],
      zoom: zoom,
      doubleClickZoom: false,
    });

    map.current.on("load", function () {
      map.current.addControl(new mapboxgl.NavigationControl(), "bottom-left");

      map.current.addControl(new mapboxgl.FullscreenControl());

      // Add the geocoder to the map
      map.current.addControl(geocoder);

      // add a source layer and default styling for a single point
      customMarker(map);
      // Listen for the `result` event from the Geocoder
      // `result` event is triggered when a user makes a selection
      //  Add a marker at the result's coordinates
      geocoder.on("result", (event) => {
        map.current.getSource("single-point").setData(event.result.geometry);
      });
    });
  }, []);

  useEffect(() => {
    map.current &&
      map.current.on("load", () =>
        generateNewMarker({
          map: map.current,
          ...map.current.getCenter(),
        })
      );

    return () => {
      map.current?.off("load", generateNewMarker);
    };
  }, []);

  return <div ref={mapContainer} className="map w-screen h-screen" />;
};

export default MapViewGecoder;
