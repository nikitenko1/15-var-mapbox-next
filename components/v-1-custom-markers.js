// https://docs.mapbox.com/help/tutorials/custom-markers-gl-js/
import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { geojson } from "@/utils/v-1-custom-markers";

const token = process.env.NEXT_PUBLIC_API_TOKEN;
// A NavigationControl control contains zoom buttons and a compass
mapboxgl.accessToken = token;

const MapCustomMarkers = () => {
  //
  const map = useRef(null);
  const mapContainer = useRef(null);
  //

  const [zoom] = useState(3);

  useEffect(() => {
    if (map.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-96, 37.8],
      zoom: zoom,
    });
    //
    map.current.on("load", () => {
      map.current.addControl(new mapboxgl.NavigationControl(), "bottom-left");

      map.current.addControl(new mapboxgl.FullscreenControl());

      // add markers to map
      for (const feature of geojson.features) {
        // create a HTML element for each feature
        const el = document.createElement("div");
        el.className = "marker";

        // make a marker for each feature and add it to the map
        new mapboxgl.Marker(el)
          .setLngLat(feature.geometry.coordinates)
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }) // add popups
              .setHTML(
                `<h3>${feature.properties.title}</h3><p>${feature.properties.description}</p>`
              )
          )
          .addTo(map.current);
      }
    });
  }, []);

  return <div ref={mapContainer} className="map w-screen h-screen" />;
};

export default MapCustomMarkers;
