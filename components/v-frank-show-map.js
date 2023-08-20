import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

const token = process.env.NEXT_PUBLIC_API_TOKEN;
// A NavigationControl control contains zoom buttons and a compass
mapboxgl.accessToken = token;

export const generateNewMarker = ({ lat, lng, map }) => {
  const popUp = new mapboxgl.Popup({ closeButton: false, anchor: "left" }).setHTML(
    `<div className="popup">You click here: <br/>[${lng},  ${lat}]</div>`
  );
  new mapboxgl.Marker({ color: "#63df29", scale: 1.5 })
    .setLngLat([lng, lat])
    .setPopup(popUp)
    .addTo(map);
};

const MapView = () => {
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

  useEffect(() => {
    map.current &&
      map.current.on("dblclick", ({ lngLat }) =>
        generateNewMarker({
          map: map.current,
          ...lngLat,
        })
      );

    return () => {
      map.current?.off("dblclick", generateNewMarker);
    };
  }, []);

  return <div ref={mapContainer} className="w-screen h-screen" />;
};

export default MapView;
