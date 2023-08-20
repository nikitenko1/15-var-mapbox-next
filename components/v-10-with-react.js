// https://docs.mapbox.com/help/tutorials/use-mapbox-gl-js-with-react/
import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

const token = process.env.NEXT_PUBLIC_API_TOKEN;
// A NavigationControl control contains zoom buttons and a compass
mapboxgl.accessToken = token;

const MapUseWithReact = () => {
  //
  const map = useRef(null);
  const mapContainer = useRef(null);
  const [lng, setLng] = useState(30.540297);
  const [lat, setLat] = useState(50.442771);
  const [zoom, setZoom] = useState(9);

  // Next, initialize the map.
  // The following code will be invoked right after the app is inserted into the DOM tree of your HTML pages
  useEffect(() => {
    if (map.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current, // initialize map only once
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng, lat],
      zoom: zoom,
    });
    //
    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-left");
    map.current.addControl(new mapboxgl.FullscreenControl());
  }, []);

  useEffect(() => {
    // After the map style has loaded on the page,
    map.current.on("load", () => {
      map.current.on("move", () => {
        setLng(map.current.getCenter().lng.toFixed(4));
        setLat(map.current.getCenter().lat.toFixed(4));
        setZoom(map.current.getZoom().toFixed(2));
      });
    });
  }, []);

  return (
    <>
      <div className="sidebar">
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>
      <div ref={mapContainer} className="w-screen h-screen relative" />
    </>
  );
};

export default MapUseWithReact;
