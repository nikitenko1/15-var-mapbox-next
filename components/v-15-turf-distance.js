// https://docs.mapbox.com/mapbox-gl-js/example/measure/
import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
// Alternatively you can import the whole lot using
import * as turf from "@turf/turf";

const token = process.env.NEXT_PUBLIC_API_TOKEN;
// A NavigationControl control contains zoom buttons and a compass
mapboxgl.accessToken = token;

const MapMeasureDistance = () => {
  //
  const map = useRef(null);
  const mapContainer = useRef(null);
  const [lng, setLng] = useState(30.540297);
  const [lat, setLat] = useState(50.442771);
  const [zoom, setZoom] = useState(12);
  //

  useEffect(() => {
    if (map.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12", // The map style to use
      center: [lng, lat], // Starting position [lng, lat]
      zoom: zoom, // Starting zoom level
    });
    //
    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-left");
    map.current.addControl(new mapboxgl.FullscreenControl());

    // After the map style has loaded on the page,
    map.current.on("load", () => {
      const distanceContainer = document.getElementById("distance");

      // GeoJSON object to hold our measurement features
      const geojson = {
        type: "FeatureCollection",
        features: [],
      };
      // Used to draw a line between points
      const linestring = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [],
        },
      };

      map.current.addSource("geojson", {
        type: "geojson",
        data: geojson,
      });

      // Add styles to the map
      map.current.addLayer({
        id: "measure-points",
        type: "circle",
        source: "geojson",
        paint: {
          "circle-radius": 5,
          "circle-color": "#000",
        },
        filter: ["in", "$type", "Point"],
      });

      map.current.addLayer({
        id: "measure-lines",
        type: "line",
        source: "geojson",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#000",
          "line-width": 2.5,
        },
        filter: ["in", "$type", "LineString"],
      });

      map.current.on("click", (e) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ["measure-points"],
        });

        // Remove the linestring from the group
        // so we can redraw it based on the points collection.
        if (geojson.features.length > 1) geojson.features.pop();

        // Clear the distance container to populate it with a new value.
        distanceContainer.innerHTML = "";

        // If a feature was clicked, remove it from the map.
        if (features.length) {
          const id = features[0].properties.id;
          geojson.features = geojson.features.filter((point) => point.properties.id !== id);
        } else {
          const point = {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [e.lngLat.lng, e.lngLat.lat],
            },
            properties: {
              id: String(new Date().getTime()),
            },
          };

          geojson.features.push(point);
        }

        if (geojson.features.length > 1) {
          linestring.geometry.coordinates = geojson.features.map(
            (point) => point.geometry.coordinates
          );

          geojson.features.push(linestring);

          // Populate the distanceContainer with total distance
          const value = document.createElement("pre");
          const distance = turf.length(linestring);
          value.textContent = `Total distance: ${distance.toLocaleString()}km`;
          distanceContainer.appendChild(value);
        }

        map.current.getSource("geojson").setData(geojson);
      });

      map.current.on("mousemove", (e) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ["measure-points"],
        });
        // Change the cursor to a pointer when hovering over a point on the map.
        // Otherwise cursor is a crosshair.
        map.current.getCanvas().style.cursor = features.length ? "pointer" : "crosshair";
      });
    });
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
      <div ref={mapContainer} className="w-screen h-screen relative" />
      <div className="sidebar">
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>
      <div id="distance" className="distance-container"></div>
    </>
  );
};

export default MapMeasureDistance;
